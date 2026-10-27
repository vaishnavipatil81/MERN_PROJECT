const { isMongoReady } = require('../config/db');
const localStore = require('../utils/localStore');

async function updateProfile(req, res, next) {
  try {
    const allowed = ['name', 'avatarUrl', 'bio', 'communicationGoals', 'interests', 'language', 'skillLevel', 'preferences'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) req.user[field] = req.body[field];
    });
    const user = isMongoReady() ? await req.user.save() : await localStore.updateUser(req.user._id, req.user);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

module.exports = { updateProfile };
