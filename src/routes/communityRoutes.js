const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const community = require('../controllers/communityController');

const router = express.Router();

router.use(protect);

router.get('/suggestions', community.suggestions);
router.post('/follow/:userId', community.followUser);
router.delete('/follow/:userId', community.unfollowUser);
router.post('/connections/:userId', community.sendConnection);
router.patch('/connections/:id', community.respondConnection);
router.get('/connections', community.connections);
router.get('/social', community.socialGraph);
router.get('/chats', community.listChats);
router.post('/chats/:userId', community.openChat);
router.get('/chats/:chatId/messages', community.chatMessages);
router.patch('/chats/:chatId/clear', community.clearChat);
router.delete('/chats/:chatId', community.deleteChat);
router.get('/groups', community.listGroups);
router.post('/groups', community.createGroup);
router.post('/groups/:id/join', community.joinGroup);
router.post('/groups/:id/leave', community.leaveGroup);
router.delete('/groups/:id', community.deleteGroup);
router.get('/groups/:id/messages', community.groupMessages);
router.get('/groups/:id/members', community.groupMembers);
router.patch('/groups/:id/clear', community.clearGroupChat);
router.get('/notifications', community.notifications);
router.patch('/notifications/read', community.markNotificationsRead);
router.delete('/notifications/:id', community.deleteNotification);
router.get('/rooms', community.listRooms);
router.post('/rooms', community.createRoom);
router.post('/rooms/join', community.joinRoom);

module.exports = router;
