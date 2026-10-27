const mongoose = require('mongoose');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Connection = require('../models/Connection');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const Notification = require('../models/Notification');
const PracticeRoom = require('../models/PracticeRoom');

const publicUserFields = 'name email avatarUrl bio communicationGoals interests language skillLevel lastActiveAt';

function toList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function roomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function suggestions(req, res, next) {
  try {
    const me = await User.findById(req.user._id);
    const users = await User.find({ _id: { $ne: req.user._id } }).select(publicUserFields).limit(80);
    const [following, accepted, outgoing, incoming] = await Promise.all([
      Follow.find({ follower: req.user._id }).select('following'),
      Connection.find({
        status: 'accepted',
        $or: [{ requester: req.user._id }, { recipient: req.user._id }]
      }).select('requester recipient'),
      Connection.find({ requester: req.user._id, status: 'pending' }).select('recipient'),
      Connection.find({ recipient: req.user._id, status: 'pending' }).select('requester')
    ]);
    const followingIds = new Set(following.map((item) => String(item.following)));
    const acceptedIds = new Set(
      accepted.map((item) => String(item.requester).toString() === String(req.user._id) ? String(item.recipient) : String(item.requester))
    );
    const outgoingIds = new Set(outgoing.map((item) => String(item.recipient)));
    const incomingIds = new Set(incoming.map((item) => String(item.requester)));

    const ranked = users
      .map((user) => {
        const sharedGoals = user.communicationGoals.filter((goal) => me.communicationGoals.includes(goal)).length;
        const sharedInterests = user.interests.filter((interest) => me.interests.includes(interest)).length;
        const sameLanguage = user.language === me.language ? 2 : 0;
        const sameSkill = user.skillLevel === me.skillLevel ? 1 : 0;
        const active = Date.now() - new Date(user.lastActiveAt || 0).getTime() < 1000 * 60 * 60 * 24 ? 1 : 0;
        const id = String(user._id);
        return {
          user,
          score: sharedGoals * 3 + sharedInterests * 2 + sameLanguage + sameSkill + active,
          isFollowing: followingIds.has(id),
          connectionStatus: acceptedIds.has(id)
            ? 'accepted'
            : outgoingIds.has(id)
              ? 'pending_sent'
              : incomingIds.has(id)
                ? 'pending_received'
                : 'none'
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 18);

    res.json({ suggestions: ranked });
  } catch (error) {
    next(error);
  }
}

async function followUser(req, res, next) {
  try {
    if (String(req.user._id) === req.params.userId) {
      res.status(400);
      throw new Error('You cannot follow yourself');
    }
    await Follow.updateOne(
      { follower: req.user._id, following: req.params.userId },
      { follower: req.user._id, following: req.params.userId },
      { upsert: true }
    );
    res.json(await countsFor(req.params.userId, req.user._id));
  } catch (error) {
    next(error);
  }
}

async function unfollowUser(req, res, next) {
  try {
    await Follow.deleteOne({ follower: req.user._id, following: req.params.userId });
    res.json(await countsFor(req.params.userId, req.user._id));
  } catch (error) {
    next(error);
  }
}

async function sendConnection(req, res, next) {
  try {
    if (String(req.user._id) === req.params.userId) {
      res.status(400);
      throw new Error('You cannot connect with yourself');
    }

    const connection = await Connection.findOneAndUpdate(
      { requester: req.user._id, recipient: req.params.userId },
      { requester: req.user._id, recipient: req.params.userId, status: 'pending' },
      { upsert: true, new: true }
    );
    await Notification.create({
      user: req.params.userId,
      actor: req.user._id,
      type: 'connection_request',
      text: `${req.user.name} sent you a connection request.`,
      entityId: String(connection._id)
    });
    res.status(201).json({ connection });
  } catch (error) {
    next(error);
  }
}

async function respondConnection(req, res, next) {
  try {
    const status = req.body.status;
    if (!['accepted', 'rejected'].includes(status)) {
      res.status(400);
      throw new Error('Invalid connection status');
    }

    const connection = await Connection.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { status },
      { new: true }
    ).populate('requester', publicUserFields);

    if (!connection) {
      res.status(404);
      throw new Error('Connection request not found');
    }

    if (status === 'accepted') {
      await Notification.create({
        user: connection.requester._id,
        actor: req.user._id,
        type: 'connection_accepted',
        text: `${req.user.name} accepted your connection request.`,
        entityId: String(connection._id)
      });
    }

    res.json({ connection });
  } catch (error) {
    next(error);
  }
}

async function connections(req, res, next) {
  try {
    const [incoming, outgoing, accepted, counts] = await Promise.all([
      Connection.find({ recipient: req.user._id, status: 'pending' }).populate('requester', publicUserFields),
      Connection.find({ requester: req.user._id, status: 'pending' }).populate('recipient', publicUserFields),
      Connection.find({
        status: 'accepted',
        $or: [{ requester: req.user._id }, { recipient: req.user._id }]
      }).populate('requester recipient', publicUserFields),
      countsFor(req.user._id, req.user._id)
    ]);
    res.json({ incoming, outgoing, accepted, counts });
  } catch (error) {
    next(error);
  }
}

async function socialGraph(req, res, next) {
  try {
    const [followers, following, counts] = await Promise.all([
      Follow.find({ following: req.user._id }).populate('follower', publicUserFields).sort({ createdAt: -1 }),
      Follow.find({ follower: req.user._id }).populate('following', publicUserFields).sort({ createdAt: -1 }),
      countsFor(req.user._id, req.user._id)
    ]);
    res.json({
      followers: followers.map((item) => item.follower).filter(Boolean),
      following: following.map((item) => item.following).filter(Boolean),
      counts
    });
  } catch (error) {
    next(error);
  }
}

async function countsFor(userId, viewerId) {
  const [followers, following, isFollowing] = await Promise.all([
    Follow.countDocuments({ following: userId }),
    Follow.countDocuments({ follower: userId }),
    Follow.exists({ follower: viewerId, following: userId })
  ]);
  return { followers, following, isFollowing: Boolean(isFollowing) };
}

async function listChats(req, res, next) {
  try {
    const chats = await Chat.find({ participants: req.user._id, deletedFor: { $ne: req.user._id } })
      .populate('participants', publicUserFields)
      .populate('lastMessage')
      .sort({ updatedAt: -1 });
    const unread = await Message.aggregate([
      { $match: { readBy: { $ne: req.user._id }, sender: { $ne: req.user._id } } },
      { $lookup: { from: 'chats', localField: 'chat', foreignField: '_id', as: 'chatDoc' } },
      { $match: { 'chatDoc.participants': req.user._id } },
      { $group: { _id: '$chat', count: { $sum: 1 } } }
    ]);
    res.json({ chats, unread });
  } catch (error) {
    next(error);
  }
}

async function openChat(req, res, next) {
  try {
    const otherId = req.params.userId;
    let chat = await Chat.findOne({ participants: { $all: [req.user._id, otherId], $size: 2 } }).populate(
      'participants',
      publicUserFields
    );
    if (!chat) {
      chat = await Chat.create({ participants: [req.user._id, otherId] });
      await chat.populate('participants', publicUserFields);
    } else if (chat.deletedFor.some((userId) => String(userId) === String(req.user._id))) {
      chat.deletedFor = chat.deletedFor.filter((userId) => String(userId) !== String(req.user._id));
      await chat.save();
    }
    res.json({ chat });
  } catch (error) {
    next(error);
  }
}

async function chatMessages(req, res, next) {
  try {
    const chat = await Chat.findOne({ _id: req.params.chatId, participants: req.user._id });
    if (!chat) {
      res.status(403);
      throw new Error('Chat access denied');
    }
    const messages = await Message.find({ chat: chat._id, hiddenFor: { $ne: req.user._id } })
      .populate('sender', publicUserFields)
      .populate({ path: 'replyTo', select: 'text sender deletedForEveryone', populate: { path: 'sender', select: publicUserFields } })
      .sort({ createdAt: 1 })
      .limit(100);
    await Message.updateMany({ chat: chat._id, sender: { $ne: req.user._id } }, { $addToSet: { readBy: req.user._id } });
    res.json({ messages });
  } catch (error) {
    next(error);
  }
}

async function clearChat(req, res, next) {
  try {
    const chat = await Chat.findOne({ _id: req.params.chatId, participants: req.user._id });
    if (!chat) {
      res.status(403);
      throw new Error('Chat access denied');
    }
    await Message.updateMany({ chat: chat._id }, { $addToSet: { hiddenFor: req.user._id } });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function deleteChat(req, res, next) {
  try {
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.chatId, participants: req.user._id },
      { $addToSet: { deletedFor: req.user._id } },
      { new: true }
    );
    if (!chat) {
      res.status(403);
      throw new Error('Chat access denied');
    }
    await Message.updateMany({ chat: chat._id }, { $addToSet: { hiddenFor: req.user._id } });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function listGroups(req, res, next) {
  try {
    const groups = await Group.find().populate('owner members', publicUserFields).sort({ createdAt: -1 });
    res.json({ groups });
  } catch (error) {
    next(error);
  }
}

async function createGroup(req, res, next) {
  try {
    const groupDoc = await Group.create({
      name: req.body.name,
      description: req.body.description,
      topic: req.body.topic,
      owner: req.user._id,
      members: [req.user._id]
    });
    const group = await groupDoc.populate('owner members', publicUserFields);
    res.status(201).json({ group });
  } catch (error) {
    next(error);
  }
}

async function joinGroup(req, res, next) {
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: req.user._id } },
      { new: true }
    ).populate('owner members', publicUserFields);
    res.json({ group });
  } catch (error) {
    next(error);
  }
}

async function leaveGroup(req, res, next) {
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $pull: { members: req.user._id } },
      { new: true }
    ).populate('owner members', publicUserFields);
    res.json({ group });
  } catch (error) {
    next(error);
  }
}

async function deleteGroup(req, res, next) {
  try {
    const group = await Group.findOne({ _id: req.params.id, owner: req.user._id });
    if (!group) {
      res.status(403);
      throw new Error('Only the group creator can delete this group');
    }
    await GroupMessage.deleteMany({ group: group._id });
    await Group.deleteOne({ _id: group._id });
    res.json({ ok: true, groupId: String(group._id) });
  } catch (error) {
    next(error);
  }
}

async function groupMessages(req, res, next) {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id });
    if (!group) {
      res.status(403);
      throw new Error('Join this group to read messages');
    }
    const messages = await GroupMessage.find({ group: group._id, hiddenFor: { $ne: req.user._id } })
      .populate('sender', publicUserFields)
      .populate({ path: 'replyTo', select: 'text sender deletedForEveryone', populate: { path: 'sender', select: publicUserFields } })
      .sort({ createdAt: 1 })
      .limit(100);
    res.json({ messages });
  } catch (error) {
    next(error);
  }
}

async function groupMembers(req, res, next) {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id }).populate('owner members', publicUserFields);
    if (!group) {
      res.status(403);
      throw new Error('Join this group to view members');
    }
    res.json({ group, members: group.members });
  } catch (error) {
    next(error);
  }
}

async function clearGroupChat(req, res, next) {
  try {
    const group = await Group.findOne({ _id: req.params.id, members: req.user._id });
    if (!group) {
      res.status(403);
      throw new Error('Join this group to clear messages');
    }
    await GroupMessage.updateMany({ group: group._id }, { $addToSet: { hiddenFor: req.user._id } });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function notifications(req, res, next) {
  try {
    const items = await Notification.find({ user: req.user._id, type: 'connection_request' })
      .populate('actor', publicUserFields)
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ notifications: items });
  } catch (error) {
    next(error);
  }
}

async function markNotificationsRead(req, res, next) {
  try {
    await Notification.updateMany({ user: req.user._id, type: 'connection_request', read: false }, { read: true });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function deleteNotification(req, res, next) {
  try {
    await Notification.deleteOne({ _id: req.params.id, user: req.user._id, type: 'connection_request' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function createRoom(req, res, next) {
  try {
    let code = roomCode();
    while (await PracticeRoom.exists({ code })) code = roomCode();
    const room = await PracticeRoom.create({
      code,
      title: req.body.title || 'Practice Room',
      host: req.user._id,
      participants: [req.user._id]
    });
    res.status(201).json({ room });
  } catch (error) {
    next(error);
  }
}

async function joinRoom(req, res, next) {
  try {
    const room = await PracticeRoom.findOneAndUpdate(
      { code: String(req.body.code || '').toUpperCase(), active: true },
      { $addToSet: { participants: req.user._id } },
      { new: true }
    ).populate('host participants', publicUserFields);
    if (!room) {
      res.status(404);
      throw new Error('Practice room not found');
    }
    res.json({ room });
  } catch (error) {
    next(error);
  }
}

async function listRooms(req, res, next) {
  try {
    const rooms = await PracticeRoom.find({ active: true }).populate('host participants', publicUserFields).sort({ createdAt: -1 }).limit(20);
    res.json({ rooms });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  suggestions,
  followUser,
  unfollowUser,
  sendConnection,
  respondConnection,
  connections,
  socialGraph,
  listChats,
  openChat,
  chatMessages,
  clearChat,
  deleteChat,
  listGroups,
  createGroup,
  joinGroup,
  leaveGroup,
  deleteGroup,
  groupMessages,
  groupMembers,
  clearGroupChat,
  notifications,
  markNotificationsRead,
  deleteNotification,
  createRoom,
  joinRoom,
  listRooms
};
