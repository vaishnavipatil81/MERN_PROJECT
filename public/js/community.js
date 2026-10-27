const Community = (() => {
  let socket;
  let activeChatId;
  let activeChatName = '';
  let activeGroupId;
  let activeGroupName = '';
  let activeChatReplyTo = null;
  let activeGroupReplyTo = null;
  let activeRoomCode;
  let localStream;
  let peerConnection;
  let makingOffer = false;
  let pendingCandidates = [];
  let onlinePracticeUsers = [];
  let activePracticeSessions = 0;
  let roomRecognition;
  let roomTranscriptText = '';
  let roomStartedAt = 0;
  let roomAnalysisTimer;
  let lastRoomMetrics = null;
  let sessionClearBound = false;
  const pendingPracticeRoomKey = 'speakflow_pending_practice_room';
  const pendingAttachments = { chat: null, group: null };
  const recorders = { chat: null, group: null };

  function connect(onUpdate = () => {}) {
    if (socket?.connected) return socket;
    socket = io({ auth: { token: API.getToken() } });
    if (!sessionClearBound) {
      window.addEventListener('speakflow:session-cleared', disconnect);
      sessionClearBound = true;
    }
    socket.on('connect_error', () => onUpdate('Realtime connection needs login.'));
    socket.on('disconnect', () => {
      onlinePracticeUsers = [];
      activePracticeSessions = 0;
      renderPracticeHubPresence();
    });
    socket.on('presence:update', () => onUpdate());
    socket.on('practice:presence', (data = {}) => {
      onlinePracticeUsers = data.onlineUsers || [];
      activePracticeSessions = Number(data.activeSessions || 0);
      renderPracticeHubPresence();
    });
    socket.on('practice:match-status', ({ message }) => setMatchStatus(message));
    socket.on('practice:invite', (invite) => handlePracticeInvite(invite, onUpdate));
    socket.on('practice:invite-sent', ({ to }) => onUpdate(`Invite sent to ${to?.name || 'student'}.`));
    socket.on('practice:invite-declined', ({ from }) => onUpdate(`${from?.name || 'Student'} declined the practice invite.`));
    socket.on('practice:invite-error', ({ message }) => onUpdate(message || 'Practice invite failed.'));
    socket.on('practice:room-ready', ({ room, partner, message }) => {
      if (partner) saveRecentPartner(partner);
      setMatchStatus(message || 'Practice session ready.');
      openPracticeRoom(room, onUpdate, message);
    });
    socket.on('notification:new', ({ notification }) => {
      if (notification?.type !== 'connection_request') return;
      addNotice(notification);
      onUpdate('New alert');
    });
    socket.on('chat:message', ({ message }) => {
      if (String(message.chat || '') !== String(activeChatId || '')) {
        incrementInactiveChat(message);
        return;
      }
      appendMessage('chatMessages', message, 'dm');
      onUpdate();
    });
    socket.on('chat:message:update', ({ message }) => {
      if (String(message.chat || '') !== String(activeChatId || '')) return;
      updateMessage('chatMessages', message, 'dm');
    });
    socket.on('chat:message:remove', ({ messageId }) => removeMessage('chatMessages', messageId));
    socket.on('chat:typing', ({ name, typing }) => {
      const el = document.getElementById('typingIndicator');
      if (el) el.textContent = typing ? `${name} is typing...` : '';
    });
    socket.on('group:message', ({ message }) => {
      if (String(message.group || '') !== String(activeGroupId || '')) return;
      appendMessage('groupMessages', message, 'group');
    });
    socket.on('group:message:update', ({ message }) => {
      if (String(message.group || '') !== String(activeGroupId || '')) return;
      updateMessage('groupMessages', message, 'group');
    });
    socket.on('group:message:remove', ({ messageId }) => removeMessage('groupMessages', messageId));
    socket.on('room:joined', ({ room }) => renderRoomStatus(room));
    socket.on('room:join-error', ({ message }) => {
      showRoomStage(false);
      stopRoomSpeechAnalysis(false);
      activeRoomCode = null;
      resetPeerConnection();
      localStream?.getTracks().forEach((track) => track.stop());
      localStream = null;
      onUpdate(message || 'Practice room not found.');
    });
    socket.on('room:participants', ({ participants }) => renderRoomParticipants(participants));
    socket.on('room:list', ({ rooms }) => renderActiveRooms(rooms));
    socket.on('room:peer-joined', async ({ user }) => {
      addRoomLine(`${user.name} joined the room.`);
      await ensurePeerConnection();
      await sendOffer();
    });
    socket.on('room:peer-left', ({ user }) => {
      addRoomLine(`${user.name} left the room.`);
      resetPeerConnection(false);
    });
    socket.on('room:signal', ({ signal }) => handleSignal(signal));
    socket.on('peer:feedback', ({ from, text }) => addRoomLine(`${from.name}: ${text}`));
    flushPendingPracticeInvites(onUpdate);
    return socket;
  }

  function disconnect() {
    if (activeRoomCode) socket?.emit('leave-room', { code: activeRoomCode });
    resetPeerConnection();
    localStream?.getTracks().forEach((track) => track.stop());
    localStream = null;
    stopRoomSpeechAnalysis(false);
    socket?.removeAllListeners();
    socket?.disconnect();
    socket = null;
    activeRoomCode = null;
    onlinePracticeUsers = [];
    activePracticeSessions = 0;
    document.getElementById('practiceInviteStack')?.remove();
    sessionStorage.removeItem('speakflow_pending_practice_invites');
  }

  async function load() {
    const [suggestions, connections, social, chats, groups, notifications, rooms] = await Promise.all([
      API.request('/api/community/suggestions'),
      API.request('/api/community/connections'),
      API.request('/api/community/social'),
      API.request('/api/community/chats'),
      API.request('/api/community/groups'),
      API.request('/api/community/notifications'),
      API.request('/api/community/rooms')
    ]);
    return { suggestions, connections, social, chats, groups, notifications, rooms };
  }

  function bind(showToast) {
    connect((message) => {
      if (message) showToast(message);
      refreshBadges();
    });

    document.querySelectorAll('[data-community-tab]').forEach((button) => {
      button.addEventListener('click', () => setTab(button.dataset.communityTab));
    });

    document.querySelector('[data-mark-alerts-read]')?.addEventListener('click', async () => {
      await API.request('/api/community/notifications/read', { method: 'PATCH' });
      document.querySelectorAll('.alert-item.unread, .notice.unread').forEach((item) => item.classList.remove('unread'));
      refreshBadges();
      showToast('Alerts marked as read.');
    });

    document.getElementById('noticeStack')?.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-delete-alert]');
      if (!button) return;
      await API.request(`/api/community/notifications/${button.dataset.deleteAlert}`, { method: 'DELETE' });
      button.closest('.alert-item')?.remove();
      refreshBadges();
      showToast('Alert deleted.');
    });

    document.querySelectorAll('[data-social-list]').forEach((button) => {
      button.addEventListener('click', () => showSocialList(button.dataset.socialList));
    });

    document.querySelectorAll('[data-follow]').forEach((button) => {
      button.addEventListener('click', async () => {
        const isFollowing = button.dataset.following === 'true';
        const method = isFollowing ? 'DELETE' : 'POST';
        const result = await API.request(`/api/community/follow/${button.dataset.follow}`, { method });
        updateFollowButton(button, !isFollowing);
        showToast(isFollowing ? 'Unfollowed.' : `Following. Followers: ${result.followers}`);
        refreshSocial();
      });
    });

    document.querySelectorAll('[data-connect]').forEach((button) => {
      button.addEventListener('click', async () => {
        await API.request(`/api/community/connections/${button.dataset.connect}`, { method: 'POST' });
        button.disabled = true;
        button.textContent = 'Requested';
        showToast('Connection request sent.');
      });
    });

    document.querySelectorAll('[data-pick-attachment]').forEach((button) => {
      button.addEventListener('click', () => {
        document.getElementById(`${button.dataset.pickAttachment}AttachmentInput`)?.click();
      });
    });

    document.querySelectorAll('input[name="attachment"]').forEach((input) => {
      input.addEventListener('change', async () => {
        await setPendingAttachment(input.id.startsWith('group') ? 'group' : 'chat', input.files?.[0], showToast);
      });
    });

    document.querySelectorAll('[data-record-voice]').forEach((button) => {
      button.addEventListener('click', () => toggleVoiceRecording(button.dataset.recordVoice, button, showToast));
    });

    document.querySelectorAll('[data-respond]').forEach((button) => {
      button.addEventListener('click', async () => {
        await API.request(`/api/community/connections/${button.dataset.respond}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: button.dataset.status })
        });
        showToast(`Request ${button.dataset.status}.`);
        App.go('community');
      });
    });

    document.querySelectorAll('[data-chat-user]').forEach((button) => {
      button.addEventListener('click', () => openChat(button.dataset.chatUser, button.dataset.chatName, showToast));
    });

    document.querySelectorAll('[data-open-chat]').forEach((button) => {
      button.addEventListener('click', () => selectChat(button.dataset.openChat, button.dataset.chatName));
    });

    document.getElementById('chatForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const input = event.currentTarget.elements.message;
      if (!activeChatId) return showToast('Open a chat first.');
      const attachment = await getPendingAttachment('chat', showToast);
      if (!input.value.trim() && !attachment) return;
      socket.emit('chat:message', { chatId: activeChatId, text: input.value, attachment, replyTo: activeChatReplyTo?.id });
      input.value = '';
      clearPendingAttachment('chat');
      clearReply('dm');
      socket.emit('chat:typing', { chatId: activeChatId, typing: false });
    });

    document.getElementById('chatMessageInput')?.addEventListener('input', (event) => {
      if (activeChatId) socket.emit('chat:typing', { chatId: activeChatId, typing: event.target.value.length > 0 });
    });

    document.getElementById('chatMessages')?.addEventListener('click', (event) => {
      handleMessageAction(event, 'dm', showToast);
    });

    document.querySelector('[data-clear-chat]')?.addEventListener('click', async () => {
      if (!activeChatId) return showToast('Open a chat first.');
      if (!confirm(`Clear all messages with ${activeChatName}?`)) return;
      await API.request(`/api/community/chats/${activeChatId}/clear`, { method: 'PATCH' });
      document.getElementById('chatMessages').innerHTML = '<p class="muted">Chat cleared for you.</p>';
      showToast('Chat cleared for you.');
    });

    document.querySelector('[data-delete-chat]')?.addEventListener('click', async () => {
      if (!activeChatId) return showToast('Open a chat first.');
      if (!confirm(`Delete chat with ${activeChatName}?`)) return;
      await API.request(`/api/community/chats/${activeChatId}`, { method: 'DELETE' });
      document.querySelector(`[data-open-chat="${activeChatId}"]`)?.remove();
      activeChatId = null;
      document.getElementById('activeChatTitle').textContent = 'Select a chat';
      document.getElementById('chatMessages').innerHTML = '<p class="muted">Select a chat to begin.</p>';
      showToast('Chat deleted for you.');
    });

    document.getElementById('groupForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const { group } = await API.request('/api/community/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          topic: form.get('topic'),
          description: form.get('description')
        })
      });
      showToast('Group created.');
      addGroupCard(group);
      event.currentTarget.reset();
      event.currentTarget.hidden = true;
    });

    document.querySelector('[data-toggle-group-form]')?.addEventListener('click', (event) => {
      const form = document.getElementById('groupForm');
      if (!form) return;
      form.hidden = !form.hidden;
      event.currentTarget.textContent = form.hidden ? 'Create group' : 'Close form';
      if (!form.hidden) form.elements.name?.focus();
    });

    document.getElementById('groupColumn')?.addEventListener('click', async (event) => {
      const join = event.target.closest('[data-join-group]');
      const open = event.target.closest('[data-open-group]');
      const remove = event.target.closest('[data-delete-group]');
      if (join) {
        const { group } = await API.request(`/api/community/groups/${join.dataset.joinGroup}/join`, { method: 'POST' });
        showToast('Joined group.');
        join.outerHTML = `<button class="btn" data-open-group="${group._id}" data-group-name="${escapeAttr(group.name)}">Open chat</button>`;
        return;
      }
      if (open) {
        selectGroup(open.dataset.openGroup, open.dataset.groupName);
        return;
      }
      if (remove) {
        if (!confirm(`Delete ${remove.dataset.groupName}? This removes the group for everyone.`)) return;
        await API.request(`/api/community/groups/${remove.dataset.deleteGroup}`, { method: 'DELETE' });
        if (activeGroupId === remove.dataset.deleteGroup) {
          activeGroupId = null;
          document.getElementById('activeGroupTitle').textContent = 'Open a group';
          document.getElementById('groupMessages').innerHTML = '<p class="muted">Open a group to chat.</p>';
        }
        remove.closest('.group-card')?.remove();
        showToast('Group deleted.');
      }
    });

    document.getElementById('groupChatForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const input = event.currentTarget.elements.message;
      if (!activeGroupId) return showToast('Open a group first.');
      const attachment = await getPendingAttachment('group', showToast);
      if (!input.value.trim() && !attachment) return;
      socket.emit('group:message', { groupId: activeGroupId, text: input.value, attachment, replyTo: activeGroupReplyTo?.id });
      input.value = '';
      clearPendingAttachment('group');
      clearReply('group');
    });

    document.getElementById('groupMessages')?.addEventListener('click', (event) => {
      handleMessageAction(event, 'group', showToast);
    });

    document.querySelector('[data-group-members]')?.addEventListener('click', () => showGroupMembers(showToast));

    document.querySelector('[data-clear-group]')?.addEventListener('click', async () => {
      if (!activeGroupId) return showToast('Open a group first.');
      if (!confirm(`Clear ${activeGroupName} chat for you?`)) return;
      await API.request(`/api/community/groups/${activeGroupId}/clear`, { method: 'PATCH' });
      document.getElementById('groupMessages').innerHTML = '<p class="muted">Group chat cleared for you.</p>';
      showToast('Group chat cleared for you.');
    });

    document.getElementById('roomCreateForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const { room } = await API.request('/api/community/rooms', {
        method: 'POST',
        body: JSON.stringify({ title: form.get('title') || 'Practice Room' })
      });
      joinRealtimeRoom(room.code, showToast);
    });

    document.querySelector('[data-random-practice]')?.addEventListener('click', (event) => {
      event.currentTarget.disabled = true;
      setMatchStatus('Finding a practice partner...');
      socket.emit('find-random-partner');
      setTimeout(() => {
        if (event.currentTarget) event.currentTarget.disabled = false;
      }, 1800);
    });

    document.getElementById('practiceStudentSearch')?.addEventListener('input', () => renderPracticeHubPresence());

    document.getElementById('availableStudents')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-practice-invite]');
      if (!button) return;
      button.disabled = true;
      button.textContent = 'Invited';
      socket.emit('practice-invite', { toUserId: button.dataset.practiceInvite });
      setTimeout(() => {
        button.disabled = false;
        button.textContent = 'Practice Together';
      }, 5000);
    });

    document.getElementById('roomJoinForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const { room } = await API.request('/api/community/rooms/join', {
        method: 'POST',
        body: JSON.stringify({ code: form.get('code') })
      });
      joinRealtimeRoom(room.code, showToast);
    });

    document.getElementById('activeRooms')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-join-room]');
      if (button) joinRealtimeRoom(button.dataset.joinRoom, showToast);
    });

    document.getElementById('leaveRoomBtn')?.addEventListener('click', () => leaveRoom(showToast));

    document.getElementById('muteRoomBtn')?.addEventListener('click', () => toggleTrack('audio', 'muteRoomBtn', 'Mute'));
    document.getElementById('cameraRoomBtn')?.addEventListener('click', () => toggleTrack('video', 'cameraRoomBtn', 'Camera'));

    document.getElementById('peerFeedbackForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = event.currentTarget.elements.feedback;
      if (!activeRoomCode) return showToast('Join a room first.');
      if (!input.value.trim()) return;
      socket.emit('peer:feedback', { code: activeRoomCode, text: input.value });
      input.value = '';
    });
    renderPracticeHubPresence();
    flushPendingPracticeRoom(showToast);
  }

  function setTab(tab) {
    document.querySelectorAll('[data-community-tab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.communityTab === tab);
    });
    document.querySelectorAll('[data-community-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.communityPanel !== tab;
    });
  }

  async function showSocialList(type) {
    const { followers, following } = await API.request('/api/community/social');
    const users = type === 'followers' ? followers : following;
    const title = type === 'followers' ? 'Followers' : 'Following';
    const modal = document.getElementById('socialModal');
    if (!modal) return;
    modal.innerHTML = `
      <div class="modal-card">
        <div class="section-head">
          <h2>${title}</h2>
          <button class="icon-btn" data-close-modal type="button">x</button>
        </div>
        <div class="stack">
          ${users.length ? users.map((user) => socialUserRow(user)).join('') : `<p class="muted">No ${title.toLowerCase()} yet.</p>`}
        </div>
      </div>
    `;
    modal.hidden = false;
    modal.querySelector('[data-close-modal]')?.addEventListener('click', () => {
      modal.hidden = true;
      modal.innerHTML = '';
    });
  }

  function socialUserRow(user) {
    return `
      <div class="social-user-row">
        <img class="avatar tiny" src="${avatar(user)}" alt="" />
        <div>
          <strong>${escapeHtml(user.name)}</strong>
          <p class="muted">${escapeHtml(user.skillLevel || 'Beginner')} - ${escapeHtml(user.language || 'English')}</p>
        </div>
        <button class="btn secondary" data-chat-user="${user._id}" data-chat-name="${escapeAttr(user.name)}">Chat</button>
      </div>
    `;
  }

  function updateFollowButton(button, isFollowing) {
    button.dataset.following = String(isFollowing);
    button.textContent = isFollowing ? 'Following' : 'Follow';
    button.classList.toggle('is-following', isFollowing);
  }

  async function refreshSocial() {
    const social = await API.request('/api/community/social').catch(() => null);
    if (!social) return;
    const followers = document.getElementById('followersCount');
    const following = document.getElementById('followingCount');
    if (followers) followers.textContent = social.counts.followers;
    if (following) following.textContent = social.counts.following;
  }

  function addNotice(notification = {}) {
    const box = document.getElementById('noticeStack');
    if (!box) return;
    if (box.querySelector('.muted')) box.innerHTML = '';
    const id = notification._id || notification.id || '';
    box.insertAdjacentHTML(
      'afterbegin',
      `<article class="alert-item unread"><span class="alert-dot"></span><div><strong>connection request</strong><p>${escapeHtml(notification.text || 'New connection request')}</p><small class="muted">Just now</small></div>${id ? `<button class="icon-btn danger" type="button" data-delete-alert="${id}" title="Delete alert">Delete</button>` : ''}</article>`
    );
  }

  async function openChat(userId, name, showToast) {
    const { chat } = await API.request(`/api/community/chats/${userId}`, { method: 'POST' });
    ensureChatRow(chat, userId, name);
    showToast(`Chat opened with ${name || 'speaker'}.`);
    setTab('chat');
    await selectChat(chat._id, name);
  }

  function ensureChatRow(chat, userId, name) {
    const list = document.getElementById('chatList');
    if (!list || list.querySelector(`[data-open-chat="${chat._id}"]`)) return;
    if (list.querySelector('.muted')) list.innerHTML = '';
    list.insertAdjacentHTML(
      'afterbegin',
      `<button class="chat-row" data-open-chat="${chat._id}" data-chat-name="${escapeAttr(name || 'Chat')}">
        <span class="avatar tiny avatar-fallback">${initials(name || 'Chat')}</span>
        <span>${escapeHtml(name || 'Chat')}</span>
      </button>`
    );
  }

  async function selectChat(chatId, name = '') {
    activeChatId = chatId;
    activeChatName = name || 'Chat';
    socket.emit('chat:join', { chatId });
    clearChatUnread(chatId);
    document.querySelectorAll('[data-open-chat]').forEach((button) => {
      button.classList.toggle('active', button.dataset.openChat === chatId);
    });
    const title = document.getElementById('activeChatTitle');
    if (title) title.textContent = activeChatName;
    const { messages } = await API.request(`/api/community/chats/${chatId}/messages`);
    const box = document.getElementById('chatMessages');
    if (box) {
      box.innerHTML = messages.map((message) => messageHtml(message, 'dm')).join('') || '<p class="muted">No messages yet. Send the first one.</p>';
      box.scrollTop = box.scrollHeight;
    }
  }

  function incrementInactiveChat(message = {}) {
    const chatId = String(message.chat || '');
    if (!chatId) return;
    const row = document.querySelector(`[data-open-chat="${chatId}"]`);
    if (!row) return;
    let badge = row.querySelector(`[data-chat-unread="${chatId}"]`);
    if (!badge) {
      const meta = row.querySelector('.chat-row-meta') || row;
      meta.insertAdjacentHTML('beforeend', `<strong class="message-count" data-chat-unread="${chatId}">+1 messages</strong>`);
      badge = row.querySelector(`[data-chat-unread="${chatId}"]`);
    } else {
      const current = Number((badge.textContent.match(/\d+/) || ['0'])[0]);
      badge.textContent = `+${current + 1} messages`;
    }
    updateChatUnreadTotal(1);
  }

  function clearChatUnread(chatId) {
    const badge = document.querySelector(`[data-chat-unread="${chatId}"]`);
    if (!badge) return;
    const current = Number((badge.textContent.match(/\d+/) || ['0'])[0]);
    badge.remove();
    updateChatUnreadTotal(-current);
  }

  function updateChatUnreadTotal(delta) {
    const total = document.getElementById('chatUnreadTotal');
    if (!total && delta > 0) {
      const chatTab = document.querySelector('[data-community-tab="chat"]');
      chatTab?.insertAdjacentHTML('beforeend', ` <span id="chatUnreadTotal" class="message-count">+${delta} messages</span>`);
      return;
    }
    if (!total) return;
    const current = Number((total.textContent.match(/\d+/) || ['0'])[0]);
    const next = Math.max(0, current + delta);
    if (!next) {
      total.remove();
      return;
    }
    total.textContent = `+${next} messages`;
  }

  async function showGroupMembers(showToast) {
    if (!activeGroupId) return showToast('Open a group first.');
    const { members, group } = await API.request(`/api/community/groups/${activeGroupId}/members`);
    const modal = document.getElementById('socialModal');
    if (!modal) return;
    modal.innerHTML = `
      <div class="modal-card">
        <div class="section-head">
          <div>
            <h2>${escapeHtml(group.name)}</h2>
            <p class="muted">${members.length} members</p>
          </div>
          <button class="icon-btn" data-close-modal type="button">x</button>
        </div>
        <div class="stack">
          ${members.map((user) => socialUserRow(user)).join('')}
        </div>
      </div>
    `;
    modal.hidden = false;
    modal.querySelector('[data-close-modal]')?.addEventListener('click', () => {
      modal.hidden = true;
      modal.innerHTML = '';
    });
    modal.querySelectorAll('[data-chat-user]').forEach((button) => {
      button.addEventListener('click', () => openChat(button.dataset.chatUser, button.dataset.chatName, showToast));
    });
  }

  async function selectGroup(groupId, name = '') {
    activeGroupId = groupId;
    activeGroupName = name || 'Group';
    socket.emit('group:join', { groupId });
    setTab('groups');
    document.querySelectorAll('[data-open-group]').forEach((button) => {
      button.classList.toggle('active', button.dataset.openGroup === groupId);
    });
    const title = document.getElementById('activeGroupTitle');
    if (title) title.textContent = activeGroupName;
    const { messages } = await API.request(`/api/community/groups/${groupId}/messages`);
    const box = document.getElementById('groupMessages');
    if (box) {
      box.innerHTML = messages.map((message) => messageHtml(message, 'group')).join('') || '<p class="muted">No group messages yet.</p>';
      box.scrollTop = box.scrollHeight;
    }
  }

  function addGroupCard(group) {
    const grid = document.getElementById('groupGrid');
    if (!grid) return;
    if (grid.querySelector('.muted')) grid.innerHTML = '';
    grid.insertAdjacentHTML(
      'afterbegin',
      `<article class="group-card">
        <div class="group-card-top">
          <h3>${escapeHtml(group.name)}</h3>
          <span class="status-pill owner-pill">Creator</span>
        </div>
        <p class="muted">${escapeHtml(group.topic || 'Practice')}</p>
        <p>${escapeHtml(group.description || 'Practice discussion group')}</p>
        <div class="card-actions">
          <span class="status-pill">${group.members.length} members</span>
          <button class="btn" data-open-group="${group._id}" data-group-name="${escapeAttr(group.name)}">Open chat</button>
          <button class="btn danger" data-delete-group="${group._id}" data-group-name="${escapeAttr(group.name)}">Delete</button>
        </div>
      </article>`
    );
  }

  async function setPendingAttachment(type, file, showToast) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Please choose a file under 5 MB.');
      clearPendingAttachment(type);
      return;
    }
    pendingAttachments[type] = file;
    const preview = document.getElementById(`${type}AttachmentPreview`);
    if (preview) {
      preview.textContent = file.type.startsWith('image/') ? `Photo: ${file.name}` : file.type.startsWith('audio/') ? `Voice: ${file.name}` : `File: ${file.name}`;
      preview.hidden = false;
    }
  }

  async function getPendingAttachment(type, showToast) {
    const file = pendingAttachments[type];
    if (!file) return null;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Please choose a file under 5 MB.');
      clearPendingAttachment(type);
      return null;
    }
    return {
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      dataUrl: await fileToDataUrl(file)
    };
  }

  function clearPendingAttachment(type) {
    pendingAttachments[type] = null;
    const input = document.getElementById(`${type}AttachmentInput`);
    const preview = document.getElementById(`${type}AttachmentPreview`);
    if (input) input.value = '';
    if (preview) {
      preview.hidden = true;
      preview.textContent = '';
    }
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function toggleVoiceRecording(type, button, showToast) {
    if (recorders[type]) {
      recorders[type].stop();
      button.textContent = 'Voice';
      button.classList.remove('recording');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      const recorder = new MediaRecorder(stream);
      recorders[type] = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
        recorders[type] = null;
        setPendingAttachment(type, file, showToast);
      };
      recorder.start();
      button.textContent = 'Stop';
      button.classList.add('recording');
    } catch (error) {
      showToast(error.message || 'Microphone permission is required.');
    }
  }

  function renderPracticeHubPresence() {
    const me = API.getUser() || {};
    const users = onlinePracticeUsers.filter((user) => String(user.id || user._id) !== String(me.id || me._id));
    const query = String(document.getElementById('practiceStudentSearch')?.value || '').trim().toLowerCase();
    const filtered = query
      ? users.filter((user) => `${user.name || ''} ${user.skillLevel || ''} ${user.language || ''}`.toLowerCase().includes(query))
      : users;
    const onlineCount = document.getElementById('practiceOnlineCount');
    const activeCount = document.getElementById('practiceActiveCount');
    const list = document.getElementById('availableStudents');
    const sessions = document.getElementById('activePracticeSessions');
    const recent = document.getElementById('recentPracticePartners');
    if (onlineCount) onlineCount.textContent = String(users.length);
    if (activeCount) activeCount.textContent = String(activePracticeSessions);
    if (sessions) sessions.textContent = `${activePracticeSessions} live ${activePracticeSessions === 1 ? 'session' : 'sessions'}`;
    if (list) {
      list.innerHTML = filtered.length
        ? filtered.map((user) => practiceStudentCard(user)).join('')
        : '<p class="muted">Nobody is available right now.</p>';
    }
    if (recent) {
      const partners = recentPartners();
      recent.innerHTML = partners.length
        ? partners.map((user) => `<span><img class="avatar tiny" src="${avatar(user)}" alt="" />${escapeHtml(user.name || 'Student')}</span>`).join('')
        : '<span class="muted">Recent partners will appear after practice.</span>';
    }
  }

  function practiceStudentCard(user) {
    const id = user.id || user._id;
    return `
      <article class="practice-student-card">
        <img class="avatar" src="${avatar(user)}" alt="" />
        <div>
          <strong>${escapeHtml(user.name || 'Student')}</strong>
          <small>${escapeHtml(user.skillLevel || 'Beginner')} - ${escapeHtml(user.language || 'English')}</small>
          <span class="online-status"><span class="dot live"></span>Online now</span>
        </div>
        <button class="btn secondary" type="button" data-practice-invite="${escapeAttr(id)}">Practice Together</button>
      </article>
    `;
  }

  function setMatchStatus(message = '') {
    const el = document.getElementById('practiceMatchStatus');
    if (el) el.textContent = message;
  }

  function handlePracticeInvite(invite = {}, onUpdate = () => {}) {
    if (!API.getToken()) return;
    const route = window.location.hash.replace('#', '') || 'dashboard';
    if (['home', 'login', 'register'].includes(route)) {
      queuePracticeInvite(invite);
      App.go('dashboard');
      return;
    }
    renderPracticeInvite(invite, onUpdate);
  }

  function queuePracticeInvite(invite = {}) {
    const pending = pendingPracticeInvites();
    const inviteId = String(invite.inviteId || '');
    if (!inviteId || pending.some((item) => String(item.inviteId) === inviteId)) return;
    pending.unshift({
      inviteId,
      from: invite.from,
      mode: invite.mode || 'friend',
      message: invite.message || ''
    });
    sessionStorage.setItem('speakflow_pending_practice_invites', JSON.stringify(pending.slice(0, 5)));
  }

  function pendingPracticeInvites() {
    try {
      return JSON.parse(sessionStorage.getItem('speakflow_pending_practice_invites') || '[]');
    } catch (error) {
      return [];
    }
  }

  function flushPendingPracticeInvites(onUpdate = () => {}) {
    if (!API.getToken()) return;
    const pending = pendingPracticeInvites();
    if (!pending.length) return;
    sessionStorage.removeItem('speakflow_pending_practice_invites');
    pending.reverse().forEach((invite) => renderPracticeInvite(invite, onUpdate));
  }

  function renderPracticeInvite({ inviteId, from, mode, message } = {}, onUpdate = () => {}) {
    if (!inviteId || !from) return;
    let stack = document.getElementById('practiceInviteStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'practiceInviteStack';
      stack.className = 'practice-invite-stack';
      document.body.appendChild(stack);
    }
    stack.insertAdjacentHTML(
      'afterbegin',
      `<article class="practice-invite-popup" data-practice-invite-popup="${escapeAttr(inviteId)}">
        <strong>${escapeHtml(message || `${from.name || 'Student'} wants to practice with you`)}</strong>
        <small class="muted">${mode === 'random' ? 'Random practice starts only if you accept.' : 'Private practice starts only if you accept.'}</small>
        <div class="card-actions">
          <button class="btn" type="button" data-accept-practice="${escapeAttr(inviteId)}">Accept</button>
          <button class="btn secondary" type="button" data-decline-practice="${escapeAttr(inviteId)}">Decline</button>
        </div>
      </article>`
    );
    const popup = stack.querySelector(`[data-practice-invite-popup="${CSS.escape(inviteId)}"]`);
    popup?.querySelector('[data-accept-practice]')?.addEventListener('click', () => {
      socket.emit('accept-practice-invite', { inviteId });
      popup.remove();
      onUpdate('Practice invite accepted.');
    });
    popup?.querySelector('[data-decline-practice]')?.addEventListener('click', () => {
      socket.emit('decline-practice-invite', { inviteId });
      popup.remove();
      onUpdate('Practice invite declined.');
    });
  }

  function recentPartners() {
    try {
      return JSON.parse(localStorage.getItem('speakflow_recent_partners') || '[]');
    } catch (error) {
      return [];
    }
  }

  function saveRecentPartner(partner) {
    const id = String(partner.id || partner._id || '');
    if (!id) return;
    const next = [partner, ...recentPartners().filter((item) => String(item.id || item._id) !== id)].slice(0, 5);
    localStorage.setItem('speakflow_recent_partners', JSON.stringify(next));
    renderPracticeHubPresence();
  }

  function openPracticeRoom(room, showToast = () => {}, message = '') {
    const code = String(room?.code || '').toUpperCase().trim();
    if (!code) return showToast('Practice room was not created.');
    if (!document.getElementById('practiceRoomStage')) {
      queuePendingPracticeRoom({ code, message });
      sessionStorage.setItem('community_tab', 'rooms');
      App.go('community');
      return;
    }
    joinRealtimeRoom(code, showToast);
  }

  function queuePendingPracticeRoom(room = {}) {
    sessionStorage.setItem(
      pendingPracticeRoomKey,
      JSON.stringify({
        code: String(room.code || '').toUpperCase().trim(),
        message: room.message || '',
        createdAt: Date.now()
      })
    );
  }

  function flushPendingPracticeRoom(showToast = () => {}) {
    let pending = null;
    try {
      pending = JSON.parse(sessionStorage.getItem(pendingPracticeRoomKey) || 'null');
    } catch (error) {
      pending = null;
    }
    sessionStorage.removeItem(pendingPracticeRoomKey);
    if (!pending?.code || Date.now() - Number(pending.createdAt || 0) > 2 * 60 * 1000) return;
    if (pending.message) setMatchStatus(pending.message);
    joinRealtimeRoom(pending.code, showToast);
  }

  function joinRealtimeRoom(code, showToast) {
    const nextCode = String(code || '').toUpperCase().trim();
    if (!nextCode) return showToast('Enter a room code first.');
    if (activeRoomCode && activeRoomCode !== nextCode) {
      socket.emit('leave-room', { code: activeRoomCode });
      resetPeerConnection();
    }
    activeRoomCode = nextCode;
    setTab('rooms');
    showRoomStage(true);
    startRoomMedia()
      .then(() => {
        startRoomSpeechAnalysis();
        socket.emit('join-private-room', { code: activeRoomCode });
        showToast(`Joined room ${activeRoomCode}.`);
      })
      .catch((error) => {
        showRoomStage(false);
        showToast(error.message || 'Camera or microphone permission is required for rooms.');
      });
  }

  async function startRoomMedia() {
    if (!localStream) {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const localVideo = document.getElementById('localRoomVideo');
      if (localVideo) localVideo.srcObject = localStream;
    }
    await ensurePeerConnection();
  }

  async function ensurePeerConnection() {
    if (peerConnection && peerConnection.signalingState !== 'closed') return peerConnection;
    peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pendingCandidates = [];
    localStream?.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
    peerConnection.ontrack = (event) => {
      const remoteVideo = document.getElementById('remoteRoomVideo');
      if (remoteVideo) remoteVideo.srcObject = event.streams[0];
    };
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && activeRoomCode) {
        socket.emit('room:signal', { code: activeRoomCode, signal: { type: 'candidate', candidate: event.candidate } });
      }
    };
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      if (state === 'connected') addRoomLine('Peer media connected.');
      if (state === 'failed' || state === 'disconnected') addRoomLine('Peer media is reconnecting.');
    };
    return peerConnection;
  }

  async function sendOffer() {
    if (!peerConnection || !activeRoomCode) return;
    try {
      makingOffer = true;
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('room:signal', { code: activeRoomCode, signal: peerConnection.localDescription });
    } finally {
      makingOffer = false;
    }
  }

  async function handleSignal(signal) {
    if (!signal) return;
    await startRoomMedia();
    if (signal.type === 'offer') {
      if (makingOffer || peerConnection.signalingState !== 'stable') {
        await peerConnection.setLocalDescription({ type: 'rollback' });
      }
      await peerConnection.setRemoteDescription(signal);
      await flushPendingCandidates();
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('room:signal', { code: activeRoomCode, signal: peerConnection.localDescription });
      addRoomLine('Peer call offer received. Answer sent.');
    } else if (signal.type === 'answer') {
      await peerConnection.setRemoteDescription(signal);
      await flushPendingCandidates();
      addRoomLine('Peer media connected.');
    } else if (signal.type === 'candidate') {
      if (peerConnection.remoteDescription) {
        await peerConnection.addIceCandidate(signal.candidate);
      } else {
        pendingCandidates.push(signal.candidate);
      }
    }
  }

  async function flushPendingCandidates() {
    if (!peerConnection?.remoteDescription) return;
    const candidates = pendingCandidates;
    pendingCandidates = [];
    for (const candidate of candidates) {
      await peerConnection.addIceCandidate(candidate).catch(() => null);
    }
  }

  function renderRoomStatus(room) {
    activeRoomCode = room.code;
    showRoomStage(true);
    const el = document.getElementById('roomStatus');
    if (el) {
      el.innerHTML = `
        <strong>${escapeHtml(room.title)}</strong>
        <span class="status-pill">Code ${room.code}</span>
        <button class="btn secondary copy-code-btn" type="button" data-copy-room="${room.code}">Copy code</button>
      `;
      el.querySelector('[data-copy-room]')?.addEventListener('click', async () => {
        await navigator.clipboard.writeText(room.code).catch(() => null);
      });
    }
    addRoomLine(`You joined room ${room.code}.`);
    const codeInput = document.querySelector('#roomJoinForm input[name="code"]');
    if (codeInput) codeInput.value = room.code;
  }

  function renderRoomParticipants(participants = []) {
    const box = document.getElementById('roomParticipants');
    if (!box) return;
    box.innerHTML = participants.map((user) => `
      <div class="participant-pill">
        <img class="avatar tiny" src="${avatar(user)}" alt="" />
        <span>${escapeHtml(user.name)}</span>
      </div>
    `).join('') || '<span class="muted">No one in room.</span>';
  }

  function renderActiveRooms(rooms = []) {
    const box = document.getElementById('activeRooms');
    if (!box) return;
    box.innerHTML = rooms.length
      ? rooms.map((room) => `
        <button class="room-card" type="button" data-join-room="${escapeAttr(room.code)}">
          <strong>${escapeHtml(room.title || 'Practice Room')}</strong>
          <span class="status-pill">${escapeHtml(room.code || '')}</span>
          <small>${Number(room.liveCount ?? room.participants?.length ?? 0)} practicing</small>
        </button>
      `).join('')
      : '<p class="muted">No active sessions yet.</p>';
  }

  function leaveRoom(showToast) {
    if (!activeRoomCode) return;
    const leavingCode = activeRoomCode;
    socket.emit('leave-room', { code: activeRoomCode });
    addRoomLine(`You left room ${activeRoomCode}.`);
    activeRoomCode = null;
    stopRoomSpeechAnalysis(true, leavingCode, showToast);
    resetPeerConnection();
    localStream?.getTracks().forEach((track) => track.stop());
    localStream = null;
    const localVideo = document.getElementById('localRoomVideo');
    const remoteVideo = document.getElementById('remoteRoomVideo');
    if (localVideo) localVideo.srcObject = null;
    if (remoteVideo) remoteVideo.srcObject = null;
    const status = document.getElementById('roomStatus');
    const participants = document.getElementById('roomParticipants');
    if (status) status.textContent = 'Create or join a room to start peer practice.';
    if (participants) participants.innerHTML = '<span class="muted">Participants will appear here.</span>';
    showRoomStage(false);
    showToast('Left room.');
  }

  function showRoomStage(active) {
    const entry = document.getElementById('practiceHubEntry');
    const stage = document.getElementById('practiceRoomStage');
    if (entry) entry.hidden = Boolean(active);
    if (stage) stage.hidden = !active;
  }

  function resetPeerConnection(clearRemote = true) {
    peerConnection?.close();
    peerConnection = null;
    makingOffer = false;
    pendingCandidates = [];
    if (clearRemote) {
      const remoteVideo = document.getElementById('remoteRoomVideo');
      if (remoteVideo) remoteVideo.srcObject = null;
    }
  }

  function toggleTrack(kind, buttonId, label) {
    const track = localStream?.getTracks().find((item) => item.kind === kind);
    if (!track) return;
    track.enabled = !track.enabled;
    const button = document.getElementById(buttonId);
    if (button) button.textContent = track.enabled ? label : `${label} off`;
  }

  function addRoomLine(text) {
    const el = document.getElementById('roomEvents');
    if (!el) return;
    if (el.querySelector('.muted')) el.innerHTML = '';
    el.insertAdjacentHTML('beforeend', `<div class="message-row system-message">${escapeHtml(text)}</div>`);
    el.scrollTop = el.scrollHeight;
  }

  function startRoomSpeechAnalysis() {
    roomTranscriptText = '';
    lastRoomMetrics = null;
    roomStartedAt = Date.now();
    updateRoomAiPanel();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      roomRecognition?.stop?.();
      roomRecognition = new SpeechRecognition();
      roomRecognition.continuous = true;
      roomRecognition.interimResults = true;
      roomRecognition.lang = 'en-US';
      roomRecognition.onresult = (event) => {
        const next = Array.from(event.results)
          .map((result) => result[0]?.transcript || '')
          .join(' ')
          .trim();
        roomTranscriptText = next;
        updateRoomAiPanel();
      };
      roomRecognition.onerror = () => addRoomLine('Speech analysis is still running from camera and microphone, but transcript access is limited.');
      roomRecognition.start();
    } else {
      addRoomLine('Speech recognition is not supported in this browser.');
    }
    clearInterval(roomAnalysisTimer);
    roomAnalysisTimer = setInterval(updateRoomAiPanel, 2200);
  }

  function updateRoomAiPanel() {
    const fillerCounts = Analytics.countFillers(roomTranscriptText);
    const fillerTotal = Analytics.totalFillers(fillerCounts);
    const wpm = Analytics.calculateWpm(roomTranscriptText, roomStartedAt || Date.now());
    const fluency = Math.max(0, Math.min(100, 92 - Math.max(0, wpm - 165) * 0.35 - Math.max(0, 110 - wpm) * 0.25 - fillerTotal * 3));
    const pronunciation = Math.max(0, Math.min(100, 88 - fillerTotal * 2 - (roomTranscriptText.length < 20 ? 18 : 0)));
    const grammar = Math.max(0, Math.min(100, 90 - fillerTotal * 1.5 - (roomTranscriptText.split(/[.!?]/).filter(Boolean).length < 2 ? 8 : 0)));
    const confidenceScore = Math.round((fluency + pronunciation + grammar) / 3);
    lastRoomMetrics = {
      title: activeRoomCode ? `Community room ${activeRoomCode}` : 'Community room practice',
      source: 'live',
      transcript: roomTranscriptText,
      durationSeconds: Math.round((Date.now() - (roomStartedAt || Date.now())) / 1000),
      wpm,
      speedLabel: Analytics.speedLabel(wpm),
      confidenceScore,
      eyeContactScore: 0,
      fillerCounts,
      suggestions: Analytics.suggestions({ fillerCounts, wpm, eyeContactScore: 0, confidenceScore })
    };
    setText('roomFluencyScore', Math.round(fluency));
    setText('roomPronunciationScore', Math.round(pronunciation));
    setText('roomGrammarScore', Math.round(grammar));
    setText('roomFillerCount', fillerTotal);
    const transcript = document.getElementById('roomTranscript');
    if (transcript) {
      transcript.innerHTML = roomTranscriptText
        ? `<p>${Analytics.highlightFillers(escapeHtml(roomTranscriptText))}</p><small class="muted">${lastRoomMetrics.suggestions.map(escapeHtml).join(' ')}</small>`
        : '<p class="muted">Live transcript and AI feedback will appear here.</p>';
      transcript.scrollTop = transcript.scrollHeight;
    }
  }

  function stopRoomSpeechAnalysis(save, roomCode, showToast = () => {}) {
    clearInterval(roomAnalysisTimer);
    roomAnalysisTimer = null;
    roomRecognition?.stop?.();
    roomRecognition = null;
    if (!save || !lastRoomMetrics || !lastRoomMetrics.transcript.trim()) {
      roomTranscriptText = '';
      lastRoomMetrics = null;
      return;
    }
    API.request('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        ...lastRoomMetrics,
        title: `Community room ${roomCode || activeRoomCode || ''}`.trim()
      })
    })
      .then(() => showToast('Feedback saved to session history.'))
      .catch(() => showToast('Session ended. Feedback could not be saved.'));
    roomTranscriptText = '';
    lastRoomMetrics = null;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function appendMessage(containerId, message, type) {
    const box = document.getElementById(containerId);
    if (!box) return;
    if (box.querySelector('.muted')) box.innerHTML = '';
    box.insertAdjacentHTML('beforeend', messageHtml(message, type));
    box.scrollTop = box.scrollHeight;
  }

  function updateMessage(containerId, message, type) {
    const box = document.getElementById(containerId);
    const row = box?.querySelector(`[data-message-id="${message._id}"]`);
    if (!box || !row) return;
    row.outerHTML = messageHtml(message, type);
  }

  function removeMessage(containerId, messageId) {
    const row = document.getElementById(containerId)?.querySelector(`[data-message-id="${messageId}"]`);
    row?.remove();
  }

  function handleMessageAction(event, type, showToast) {
    const button = event.target.closest('[data-message-action]');
    if (!button) return;
    const row = button.closest('[data-message-id]');
    const messageId = row?.dataset.messageId;
    if (!messageId) return;
    const action = button.dataset.messageAction;
    const eventName = type === 'group' ? 'group' : 'chat';
    const payload = type === 'group' ? { groupId: activeGroupId, messageId } : { chatId: activeChatId, messageId };

    if (action === 'edit') {
      const currentText = row.querySelector('[data-message-text]')?.textContent || '';
      const text = prompt('Edit message', currentText);
      if (!text || !text.trim()) return;
      socket.emit(`${eventName}:edit`, { ...payload, text });
      showToast('Message updated.');
      return;
    }

    if (action === 'reply') {
      const sender = row.querySelector('[data-message-sender]')?.textContent || 'User';
      const text = row.querySelector('[data-message-text]')?.textContent || '';
      setReply(type, { id: messageId, sender, text });
      return;
    }

    if (action === 'delete-me') {
      socket.emit(`${eventName}:delete`, { ...payload, scope: 'me' });
      showToast('Message deleted for you.');
      return;
    }

    if (action === 'delete-everyone' && confirm('Delete this message for everyone?')) {
      socket.emit(`${eventName}:delete`, { ...payload, scope: 'everyone' });
      showToast('Message deleted for everyone.');
    }
  }

  function messageHtml(message, type) {
    const me = API.getUser() || {};
    const senderId = String(message.sender?._id || message.sender?.id || '');
    const mine = senderId === String(me.id);
    const deleted = Boolean(message.deletedForEveryone);
    const edited = Boolean(message.editedAt);
    const reply = message.replyTo && !message.replyTo.deletedForEveryone ? message.replyTo : null;
    const attachment = attachmentHtml(message.attachment);
    return `
      <div class="message-row ${mine ? 'mine' : ''} ${deleted ? 'deleted-message' : ''} ${type === 'group' ? 'group-message' : ''}" data-message-id="${message._id}">
        <img class="avatar tiny" src="${avatar(message.sender)}" alt="" />
        <div class="bubble">
          <div class="message-meta">
            <strong data-message-sender>${escapeHtml(message.sender?.name || 'User')}</strong>
            <span>${new Date(message.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${edited ? ' edited' : ''}</span>
          </div>
          ${
            reply
              ? `<button class="reply-quote" type="button" data-scroll-reply="${reply._id}">
                <strong>${escapeHtml(reply.sender?.name || 'User')}</strong>
                <span>${escapeHtml(reply.text || '')}</span>
              </button>`
              : ''
          }
          ${message.text ? `<p data-message-text>${escapeHtml(message.text)}</p>` : '<p data-message-text hidden></p>'}
          ${attachment}
          ${
            deleted
              ? ''
              : `<div class="message-menu">
                <button class="message-menu-trigger" type="button" aria-label="Message options">∨</button>
                <div class="message-actions" role="menu">
                  <button type="button" data-message-action="reply">Reply</button>
                  ${mine ? '<button type="button" data-message-action="edit">Edit</button>' : ''}
                  <button type="button" data-message-action="delete-me">Delete for me</button>
                  ${mine ? '<button type="button" data-message-action="delete-everyone">Delete for everyone</button>' : ''}
                </div>
              </div>`
          }
        </div>
      </div>
    `;
  }

  function attachmentHtml(attachment = null) {
    if (!attachment?.dataUrl) return '';
    const name = escapeHtml(attachment.name || 'Attachment');
    if (attachment.kind === 'image') {
      return `<a class="message-attachment image-attachment" href="${attachment.dataUrl}" download="${escapeAttr(attachment.name || 'photo')}" target="_blank"><img src="${attachment.dataUrl}" alt="${name}" /><span>${name}</span></a>`;
    }
    if (attachment.kind === 'audio') {
      return `<div class="message-attachment"><audio controls src="${attachment.dataUrl}"></audio><a href="${attachment.dataUrl}" download="${escapeAttr(attachment.name || 'voice.webm')}">${name}</a></div>`;
    }
    return `<a class="message-attachment file-attachment" href="${attachment.dataUrl}" download="${escapeAttr(attachment.name || 'file')}" target="_blank">${name}</a>`;
  }

  function setReply(type, reply) {
    if (type === 'group') {
      activeGroupReplyTo = reply;
    } else {
      activeChatReplyTo = reply;
    }
    const form = document.getElementById(type === 'group' ? 'groupChatForm' : 'chatForm');
    const previewId = type === 'group' ? 'groupReplyPreview' : 'chatReplyPreview';
    const preview = form?.querySelector(`#${previewId}`);
    if (preview) {
      preview.innerHTML = `
        <div>
          <strong>Replying to ${escapeHtml(reply.sender)}</strong>
          <span>${escapeHtml(reply.text).slice(0, 120)}</span>
        </div>
        <button type="button" data-cancel-reply="${type}" aria-label="Cancel reply">x</button>
      `;
      preview.hidden = false;
      preview.querySelector('[data-cancel-reply]')?.addEventListener('click', () => clearReply(type));
    }
    form?.elements.message?.focus();
  }

  function clearReply(type) {
    if (type === 'group') {
      activeGroupReplyTo = null;
    } else {
      activeChatReplyTo = null;
    }
    const preview = document.getElementById(type === 'group' ? 'groupReplyPreview' : 'chatReplyPreview');
    if (preview) {
      preview.hidden = true;
      preview.innerHTML = '';
    }
  }

  async function refreshBadges() {
    const data = await API.request('/api/community/notifications').catch(() => ({ notifications: [] }));
    const badge = document.getElementById('notificationBadge');
    const count = data.notifications.filter((item) => !item.read).length;
    if (badge) badge.textContent = count ? String(count) : '';
  }

  function avatar(user = {}) {
    return user.avatarUrl || `https://ui-avatars.com/api/?background=5eead4&color=07111f&name=${encodeURIComponent(user.name || 'SF')}`;
  }

  function initials(name = 'SF') {
    return name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  function escapeHtml(value = '') {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  function escapeAttr(value = '') {
    return escapeHtml(value).replace(/"/g, '&quot;');
  }

  return { load, bind, avatar, connect, disconnect, refreshBadges, flushPendingPracticeInvites };
})();
