const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isMongoReady } = require('../config/db');
const localStore = require('../utils/localStore');
const { isAdminUser } = require('../utils/token');

async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;

    if (!token) {
      res.status(401);
      throw new Error('Authentication token required');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = isMongoReady()
      ? await User.findById(decoded.id).select('-password -resetToken -resetTokenExpires')
      : await localStore.findUserById(decoded.id);

    if (!req.user) {
      res.status(401);
      throw new Error('User no longer exists');
    }

    req.user.isAdmin = isAdminUser(req.user);
    next();
  } catch (error) {
    res.status(res.statusCode === 200 ? 401 : res.statusCode);
    next(error);
  }
}

function adminOnly(req, res, next) {
  if (!req.user?.isAdmin) {
    res.status(403);
    return next(new Error('Admin access required'));
  }
  next();
}

module.exports = { protect, adminOnly };
