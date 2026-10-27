const User = require('../models/User');
const SpeechSession = require('../models/SpeechSession');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const Connection = require('../models/Connection');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const Review = require('../models/Review');
const { isMongoReady } = require('../config/db');
const { isAdminUser } = require('../utils/token');
const localStore = require('../utils/localStore');

async function overview(req, res, next) {
  try {
    if (!isMongoReady()) {
      return res.json(await localStore.adminOverview());
    }

    const [users, sessions, groups, reviews, userRows, sessionRows, groupRows, reviewRows] =
      await Promise.all([
        User.countDocuments(),
        SpeechSession.countDocuments(),
        Group.countDocuments(),
        Review.countDocuments(),
        User.find().select('name email skillLevel language createdAt lastActiveAt').sort({ createdAt: -1 }).limit(50),
        SpeechSession.find()
          .populate('user', 'name email')
          .select('title source confidenceScore wpm speedLabel eyeContactScore fillerCounts durationSeconds transcript suggestions createdAt user')
          .sort({ createdAt: -1 })
          .limit(50),
        Group.find()
          .populate('owner members', 'name email skillLevel language')
          .select('name topic description owner members createdAt')
          .sort({ createdAt: -1 })
          .limit(50),
        Review.find().populate('userId', 'email skillLevel language').sort({ createdAt: -1 }).limit(80)
      ]);

    res.json({
      stats: { users, sessions, groups, reviews },
      users: userRows,
      sessions: sessionRows,
      groups: groupRows,
      reviews: reviewRows,
      meta: { mode: 'mongo' }
    });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    if (!isMongoReady()) {
      if (String(req.params.id) === String(req.user._id)) {
        res.status(400);
        throw new Error('Admin account cannot be removed here');
      }
      const user = await localStore.findUserById(req.params.id);
      if (!user) {
        res.status(404);
        throw new Error('User not found');
      }
      if (isAdminUser(user)) {
        res.status(400);
        throw new Error('Admin account cannot be removed here');
      }
      await localStore.adminDeleteUser(req.params.id);
      return res.json({ ok: true });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    if (String(user._id) === String(req.user._id) || isAdminUser(user)) {
      res.status(400);
      throw new Error('Admin account cannot be removed here');
    }

    const chats = await Chat.find({ participants: user._id }).select('_id');
    const chatIds = chats.map((chat) => chat._id);
    const memberGroups = await Group.find({ members: user._id }).select('_id');
    const memberGroupIds = memberGroups.map((group) => group._id);
    const ownedGroups = await Group.find({ owner: user._id }).select('_id');
    const ownedGroupIds = ownedGroups.map((group) => group._id);

    await Promise.all([
      SpeechSession.deleteMany({ user: user._id }),
      Message.deleteMany({ $or: [{ sender: user._id }, { chat: { $in: chatIds } }] }),
      Chat.deleteMany({ _id: { $in: chatIds } }),
      GroupMessage.deleteMany({ $or: [{ sender: user._id }, { group: { $in: ownedGroupIds } }] }),
      Group.updateMany({ _id: { $in: memberGroupIds } }, { $pull: { members: user._id } }),
      Group.deleteMany({ owner: user._id }),
      Connection.deleteMany({ $or: [{ requester: user._id }, { recipient: user._id }] }),
      Follow.deleteMany({ $or: [{ follower: user._id }, { following: user._id }] }),
      Notification.deleteMany({ $or: [{ user: user._id }, { actor: user._id }] }),
      Review.deleteMany({ userId: user._id }),
      User.deleteOne({ _id: user._id })
    ]);

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function deleteReview(req, res, next) {
  try {
    if (!isMongoReady()) {
      res.status(503);
      throw new Error('Review management needs MongoDB');
    }
    await Review.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

module.exports = { overview, deleteUser, deleteReview };
