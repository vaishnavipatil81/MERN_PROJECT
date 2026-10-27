const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const PracticeRoom = require('../models/PracticeRoom');
const { countFillers, speedLabel, createSuggestions } = require('../utils/analysis');
const { isMongoReady } = require('../config/db');
const localStore = require('../utils/localStore');

function calculateConfidence({ fillerCounts, wpm, eyeContactScore, pauseCount = 0 }) {
  const totalFillers = Object.values(fillerCounts || {}).reduce((sum, count) => sum + count, 0);
  const speedPenalty = wpm < 110 ? 12 : wpm > 165 ? 14 : 0;
  const fillerPenalty = Math.min(totalFillers * 4, 28);
  const pausePenalty = Math.min(pauseCount * 3, 15);
  const eyePenalty = Math.max(0, 100 - Number(eyeContactScore || 0)) * 0.25;
  return Math.max(0, Math.min(100, Math.round(100 - speedPenalty - fillerPenalty - pausePenalty - eyePenalty)));
}

function roomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function configureSocket(server) {
  const io = new Server(server, {
    maxHttpBufferSize: 20 * 1024 * 1024,
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  function cleanAttachment(attachment = null) {
    if (!attachment || typeof attachment !== 'object') return undefined;
    const dataUrl = String(attachment.dataUrl || '');
    const mimeType = String(attachment.mimeType || '');
    if (!dataUrl.startsWith('data:') || dataUrl.length > 12 * 1024 * 1024) return undefined;
    const kind = mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('audio/') ? 'audio' : 'file';
    return {
      kind,
      dataUrl,
      mimeType: mimeType.slice(0, 120),
      name: String(attachment.name || 'attachment').slice(0, 160),
      size: Math.max(0, Number(attachment.size || 0))
    };
  }

  const onlineUsers = new Map();
  const roomMembers = new Map();
  const practiceInvites = new Map();

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error('Socket authentication required');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = isMongoReady()
        ? await User.findById(decoded.id).select('name email avatarUrl skillLevel language')
        : await localStore.findUserById(decoded.id);
      if (!user) throw new Error('User not found');
      socket.user = user;
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on('connection', async (socket) => {
    const userId = String(socket.user._id);
    socket.join(`user:${userId}`);
    addOnlineSocket(socket);
    if (isMongoReady()) User.findByIdAndUpdate(userId, { lastActiveAt: new Date() }).catch(() => null);
    io.emit('presence:update', { userId, online: true });
    emitPracticePresence();
    emitRoomList(socket);

    socket.on('practice:metrics', (payload = {}) => {
      const fillerCounts = payload.fillerCounts || countFillers(payload.transcript || '');
      const wpm = Number(payload.wpm || 0);
      const eyeContactScore = Number(payload.eyeContactScore || 0);
      const confidenceScore = calculateConfidence({
        fillerCounts,
        wpm,
        eyeContactScore,
        pauseCount: payload.pauseCount
      });

      socket.emit('practice:feedback', {
        fillerCounts,
        wpm,
        speedLabel: speedLabel(wpm),
        eyeContactScore,
        confidenceScore,
        suggestions: createSuggestions({ fillerCounts, wpm, eyeContactScore, confidenceScore })
      });
    });

    socket.on('chat:join', async ({ chatId }) => {
      const chat = await Chat.findOne({ _id: chatId, participants: socket.user._id });
      if (chat) socket.join(`chat:${chatId}`);
    });

    socket.on('chat:typing', async ({ chatId, typing }) => {
      const chat = await Chat.findOne({ _id: chatId, participants: socket.user._id });
      if (!chat) return;
      socket.to(`chat:${chatId}`).emit('chat:typing', {
        chatId,
        userId,
        name: socket.user.name,
        typing: Boolean(typing)
      });
    });

    socket.on('chat:message', async ({ chatId, text, replyTo, attachment }) => {
      const cleanText = String(text || '').trim();
      const cleanFile = cleanAttachment(attachment);
      if (!cleanText && !cleanFile) return;
      const chat = await Chat.findOne({ _id: chatId, participants: socket.user._id });
      if (!chat) return;
      if (chat.deletedFor.some((participant) => String(participant) === userId)) {
        chat.deletedFor = chat.deletedFor.filter((participant) => String(participant) !== userId);
      }

      const reply = replyTo
        ? await Message.findOne({ _id: replyTo, chat: chat._id, hiddenFor: { $ne: socket.user._id } })
        : null;
      const message = await Message.create({
        chat: chat._id,
        sender: socket.user._id,
        text: cleanText,
        attachment: cleanFile,
        replyTo: reply?._id,
        readBy: [socket.user._id]
      });
      chat.lastMessage = message._id;
      await chat.save();
      const populated = await message.populate([
        { path: 'sender', select: 'name email avatarUrl' },
        { path: 'replyTo', select: 'text sender deletedForEveryone', populate: { path: 'sender', select: 'name email avatarUrl' } }
      ]);
      io.to(`chat:${chatId}`).emit('chat:message', { message: populated });
    });

    socket.on('chat:edit', async ({ chatId, messageId, text }) => {
      const cleanText = String(text || '').trim();
      if (!cleanText) return;
      const chat = await Chat.findOne({ _id: chatId, participants: socket.user._id });
      if (!chat) return;
      const message = await Message.findOneAndUpdate(
        { _id: messageId, chat: chat._id, sender: socket.user._id, deletedForEveryone: false },
        { text: cleanText, editedAt: new Date() },
        { new: true }
      ).populate([
        { path: 'sender', select: 'name email avatarUrl' },
        { path: 'replyTo', select: 'text sender deletedForEveryone', populate: { path: 'sender', select: 'name email avatarUrl' } }
      ]);
      if (!message) return;
      io.to(`chat:${chatId}`).emit('chat:message:update', { message });
    });

    socket.on('chat:delete', async ({ chatId, messageId, scope }) => {
      const chat = await Chat.findOne({ _id: chatId, participants: socket.user._id });
      if (!chat) return;
      const message = await Message.findOne({ _id: messageId, chat: chat._id });
      if (!message) return;

      if (scope === 'everyone') {
        if (String(message.sender) !== userId) return;
        message.text = 'This message was deleted';
        message.attachment = undefined;
        message.deletedForEveryone = true;
        message.editedAt = undefined;
        await message.save();
        const populated = await message.populate('sender', 'name email avatarUrl');
        io.to(`chat:${chatId}`).emit('chat:message:update', { message: populated });
      } else {
        await Message.updateOne({ _id: message._id }, { $addToSet: { hiddenFor: socket.user._id } });
        socket.emit('chat:message:remove', { messageId: String(message._id) });
      }
    });

    socket.on('group:join', async ({ groupId }) => {
      const group = await Group.findOne({ _id: groupId, members: socket.user._id });
      if (group) socket.join(`group:${groupId}`);
    });

    socket.on('group:message', async ({ groupId, text, replyTo, attachment }) => {
      const cleanText = String(text || '').trim();
      const cleanFile = cleanAttachment(attachment);
      if (!cleanText && !cleanFile) return;
      const group = await Group.findOne({ _id: groupId, members: socket.user._id });
      if (!group) return;
      const reply = replyTo
        ? await GroupMessage.findOne({ _id: replyTo, group: group._id, hiddenFor: { $ne: socket.user._id } })
        : null;
      const message = await GroupMessage.create({
        group: group._id,
        sender: socket.user._id,
        text: cleanText,
        attachment: cleanFile,
        replyTo: reply?._id
      });
      const populated = await message.populate([
        { path: 'sender', select: 'name email avatarUrl' },
        { path: 'replyTo', select: 'text sender deletedForEveryone', populate: { path: 'sender', select: 'name email avatarUrl' } }
      ]);
      io.to(`group:${groupId}`).emit('group:message', { message: populated });
    });

    socket.on('group:edit', async ({ groupId, messageId, text }) => {
      const cleanText = String(text || '').trim();
      if (!cleanText) return;
      const group = await Group.findOne({ _id: groupId, members: socket.user._id });
      if (!group) return;
      const message = await GroupMessage.findOneAndUpdate(
        { _id: messageId, group: group._id, sender: socket.user._id, deletedForEveryone: false },
        { text: cleanText, editedAt: new Date() },
        { new: true }
      ).populate([
        { path: 'sender', select: 'name email avatarUrl' },
        { path: 'replyTo', select: 'text sender deletedForEveryone', populate: { path: 'sender', select: 'name email avatarUrl' } }
      ]);
      if (!message) return;
      io.to(`group:${groupId}`).emit('group:message:update', { message });
    });

    socket.on('group:delete', async ({ groupId, messageId, scope }) => {
      const group = await Group.findOne({ _id: groupId, members: socket.user._id });
      if (!group) return;
      const message = await GroupMessage.findOne({ _id: messageId, group: group._id });
      if (!message) return;

      if (scope === 'everyone') {
        if (String(message.sender) !== userId) return;
        message.text = 'This message was deleted';
        message.attachment = undefined;
        message.deletedForEveryone = true;
        message.editedAt = undefined;
        await message.save();
        const populated = await message.populate('sender', 'name email avatarUrl');
        io.to(`group:${groupId}`).emit('group:message:update', { message: populated });
      } else {
        await GroupMessage.updateOne({ _id: message._id }, { $addToSet: { hiddenFor: socket.user._id } });
        socket.emit('group:message:remove', { messageId: String(message._id) });
      }
    });

    socket.on('room:join', async ({ code }) => {
      await joinPracticeRoom(socket, code);
    });

    socket.on('join-private-room', async ({ code }) => {
      await joinPracticeRoom(socket, code);
    });

    socket.on('room:signal', async ({ code, signal }) => {
      const room = await PracticeRoom.findOne({ code: String(code || '').toUpperCase(), participants: socket.user._id });
      if (!room) return;
      socket.to(`room:${room.code}`).emit('room:signal', {
        from: userId,
        signal
      });
    });

    socket.on('peer:feedback', async ({ code, text }) => {
      const room = await PracticeRoom.findOne({ code: String(code || '').toUpperCase(), participants: socket.user._id });
      if (!room) return;
      io.to(`room:${room.code}`).emit('peer:feedback', {
        from: { id: userId, name: socket.user.name },
        text: String(text || '').trim(),
        createdAt: new Date()
      });
    });

    socket.on('room:leave', async ({ code }) => {
      leaveRoom(String(code || '').toUpperCase(), socket);
      emitRoomList();
    });

    socket.on('leave-room', async ({ code }) => {
      leaveRoom(String(code || '').toUpperCase(), socket);
      emitRoomList();
    });

    socket.on('find-random-partner', async () => {
      socket.emit('practice:match-status', { status: 'searching', message: 'Finding a practice partner...' });
      const partner = availablePracticeUsers(userId)[0];
      if (!partner) {
        return socket.emit('practice:match-status', { status: 'empty', message: 'Nobody is available right now' });
      }
      const inviteId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      practiceInvites.set(inviteId, {
        id: inviteId,
        fromUserId: userId,
        toUserId: partner.id,
        mode: 'random',
        createdAt: Date.now()
      });
      io.to(`user:${partner.id}`).emit('practice:invite', {
        inviteId,
        from: publicSocketUser(socket),
        mode: 'random',
        message: `${socket.user.name} wants to start random practice with you.`
      });
      socket.emit('practice:match-status', {
        status: 'pending',
        message: `Invite sent to ${partner.name}. Waiting for acceptance...`
      });
    });

    socket.on('practice-invite', ({ toUserId }) => {
      const targetId = String(toUserId || '');
      const target = onlineUsers.get(targetId);
      if (!target || targetId === userId) {
        return socket.emit('practice:invite-error', { message: 'That student is not available right now.' });
      }
      const inviteId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      practiceInvites.set(inviteId, {
        id: inviteId,
        fromUserId: userId,
        toUserId: targetId,
        createdAt: Date.now()
      });
      io.to(`user:${targetId}`).emit('practice:invite', {
        inviteId,
        from: publicSocketUser(socket)
      });
      socket.emit('practice:invite-sent', { inviteId, to: publicOnlineUser(target) });
    });

    socket.on('accept-practice-invite', async ({ inviteId }) => {
      const invite = practiceInvites.get(String(inviteId || ''));
      if (!invite || invite.toUserId !== userId || Date.now() - invite.createdAt > 2 * 60 * 1000) {
        return socket.emit('practice:invite-error', { message: 'This invite is no longer available.' });
      }
      practiceInvites.delete(invite.id);
      const from = onlineUsers.get(invite.fromUserId);
      if (!from) return socket.emit('practice:invite-error', { message: 'That student is no longer online.' });
      const title = invite.mode === 'random' ? 'Random Practice' : 'Friend Practice';
      const room = await createPrivateRoom(socket.user._id, [socket.user._id, invite.fromUserId], title);
      socket.emit('practice:room-ready', {
        room,
        partner: publicOnlineUser(from),
        message: `Starting practice with ${from.name}.`
      });
      io.to(`user:${invite.fromUserId}`).emit('practice:room-ready', {
        room,
        partner: publicSocketUser(socket),
        message: `${socket.user.name} accepted your practice invite.`
      });
      emitRoomList();
      emitPracticePresence();
    });

    socket.on('decline-practice-invite', ({ inviteId }) => {
      const invite = practiceInvites.get(String(inviteId || ''));
      if (!invite || invite.toUserId !== userId) return;
      practiceInvites.delete(invite.id);
      io.to(`user:${invite.fromUserId}`).emit('practice:invite-declined', {
        inviteId: invite.id,
        from: publicSocketUser(socket)
      });
    });

    socket.on('disconnect', async () => {
      removeOnlineSocket(socket);
      leaveAllRooms(socket);
      if (isMongoReady()) await User.findByIdAndUpdate(userId, { lastActiveAt: new Date() });
      io.emit('presence:update', { userId, online: Boolean(onlineUsers.get(userId)) });
      emitPracticePresence();
    });
  });

  async function joinPracticeRoom(socket, code) {
    const room = await PracticeRoom.findOneAndUpdate(
      { code: String(code || '').toUpperCase(), active: true },
      { $addToSet: { participants: socket.user._id } },
      { new: true }
    );
    if (!room) {
      socket.emit('room:join-error', { message: 'Practice room not found or already ended.' });
      return;
    }
    socket.join(`room:${room.code}`);
    activeRoomCodeForSocket(socket, room.code);
    addRoomMember(room.code, socket);
    socket.to(`room:${room.code}`).emit('room:peer-joined', {
      code: room.code,
      user: publicSocketUser(socket)
    });
    io.to(`room:${room.code}`).emit('room:participants', { code: room.code, participants: listRoomMembers(room.code) });
    socket.emit('room:joined', { room });
    emitRoomList();
    emitPracticePresence();
  }

  async function createPrivateRoom(host, participantIds, title) {
    let code = roomCode();
    while (await PracticeRoom.exists({ code })) code = roomCode();
    return PracticeRoom.create({
      code,
      title,
      host,
      participants: [...new Set(participantIds.map((id) => String(id)))]
    });
  }

  function addOnlineSocket(socket) {
    const id = String(socket.user._id);
    const current = onlineUsers.get(id) || {
      id,
      name: socket.user.name,
      email: socket.user.email,
      avatarUrl: socket.user.avatarUrl,
      skillLevel: socket.user.skillLevel || 'Beginner',
      language: socket.user.language || 'English',
      sockets: new Set()
    };
    current.sockets.add(socket.id);
    onlineUsers.set(id, current);
  }

  function removeOnlineSocket(socket) {
    const id = String(socket.user._id);
    const current = onlineUsers.get(id);
    if (!current) return;
    current.sockets.delete(socket.id);
    if (!current.sockets.size) onlineUsers.delete(id);
  }

  function publicSocketUser(socket) {
    return {
      id: String(socket.user._id),
      _id: String(socket.user._id),
      name: socket.user.name,
      email: socket.user.email,
      avatarUrl: socket.user.avatarUrl,
      skillLevel: socket.user.skillLevel || 'Beginner',
      language: socket.user.language || 'English'
    };
  }

  function publicOnlineUser(user) {
    return {
      id: user.id,
      _id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      skillLevel: user.skillLevel || 'Beginner',
      language: user.language || 'English'
    };
  }

  function availablePracticeUsers(currentUserId) {
    const busyIds = new Set();
    roomMembers.forEach((members) => {
      if (members.size >= 2) members.forEach((member) => busyIds.add(String(member.id)));
    });
    return Array.from(onlineUsers.values())
      .filter((user) => user.id !== currentUserId && !busyIds.has(user.id))
      .map(publicOnlineUser);
  }

  function emitPracticePresence(target = io) {
    target.emit('practice:presence', {
      onlineUsers: Array.from(onlineUsers.values()).map(publicOnlineUser),
      activeSessions: Array.from(roomMembers.values()).filter((members) => members.size > 0).length
    });
  }

  function activeRoomCodeForSocket(socket, code) {
    socket.activeRoomCodes = socket.activeRoomCodes || new Set();
    socket.activeRoomCodes.add(code);
  }

  function addRoomMember(code, socket) {
    if (!roomMembers.has(code)) roomMembers.set(code, new Map());
    roomMembers.get(code).set(socket.id, {
      socketId: socket.id,
      id: String(socket.user._id),
      name: socket.user.name,
      avatarUrl: socket.user.avatarUrl
    });
  }

  function listRoomMembers(code) {
    return Array.from(roomMembers.get(code)?.values() || []);
  }

  async function leaveRoom(code, socket) {
    if (!code || !roomMembers.has(code)) return;
    roomMembers.get(code).delete(socket.id);
    socket.leave(`room:${code}`);
    socket.activeRoomCodes?.delete(code);
    io.to(`room:${code}`).emit('room:peer-left', {
      code,
      user: { id: String(socket.user._id), name: socket.user.name, avatarUrl: socket.user.avatarUrl }
    });
    io.to(`room:${code}`).emit('room:participants', { code, participants: listRoomMembers(code) });
    if (!roomMembers.get(code).size) {
      roomMembers.delete(code);
      PracticeRoom.updateOne({ code }, { active: false }).catch(() => null);
    }
    emitPracticePresence();
    emitRoomList();
  }

  function leaveAllRooms(socket) {
    Array.from(socket.activeRoomCodes || []).forEach((code) => leaveRoom(code, socket));
  }

  async function emitRoomList(target = io) {
    const rooms = await PracticeRoom.find({ active: true })
      .populate('host participants', 'name email avatarUrl bio communicationGoals interests language skillLevel lastActiveAt')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
      .catch(() => []);
    target.emit('room:list', {
      rooms: rooms.map((room) => ({
        ...room,
        liveCount: roomMembers.get(room.code)?.size || 0
      }))
    });
  }

  return io;
}

module.exports = { configureSocket, calculateConfidence };
