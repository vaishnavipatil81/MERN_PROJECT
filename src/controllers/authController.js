const crypto = require('crypto');
const User = require('../models/User');
const { authResponse } = require('../utils/token');
const { isMongoReady } = require('../config/db');
const localStore = require('../utils/localStore');

function adminCredentials(email, password) {
  return (
    process.env.ADMIN_EMAIL &&
    process.env.ADMIN_PASSWORD &&
    String(email || '').trim().toLowerCase() === String(process.env.ADMIN_EMAIL).trim().toLowerCase() &&
    String(password || '') === String(process.env.ADMIN_PASSWORD)
  );
}

async function findOrCreateAdminUser() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const name = process.env.ADMIN_USERNAME || 'Admin';
  let user = await User.findOne({ email }).select('+password');
  if (!user) {
    user = await User.create({
      name,
      email,
      password: process.env.ADMIN_PASSWORD,
      skillLevel: 'Advanced',
      language: 'English',
      bio: 'SpeakFlow administrator'
    });
    user = await User.findById(user._id).select('+password');
  } else if (!(await user.comparePassword(process.env.ADMIN_PASSWORD))) {
    user.password = process.env.ADMIN_PASSWORD;
    if (name && user.name !== name) user.name = name;
    await user.save();
    user = await User.findById(user._id).select('+password');
  }
  return user;
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!isMongoReady()) {
      const user = await localStore.createUser({ name, email, password });
      return res.status(201).json(authResponse(user));
    }

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409);
      throw new Error('Email already registered');
    }

    const user = await User.create({ name, email, password });
    res.status(201).json(authResponse(user));
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password, role = 'student' } = req.body;
    const wantsAdmin = role === 'admin';
    const matchesAdmin = adminCredentials(email, password);

    if (wantsAdmin && !matchesAdmin) {
      res.status(401);
      throw new Error('Invalid admin email or password');
    }
    if (!wantsAdmin && matchesAdmin) {
      res.status(403);
      throw new Error('Select Admin to login with admin credentials');
    }

    if (!isMongoReady()) {
      if (wantsAdmin) {
        const admin = await localStore.findOrCreateAdmin({
          name: process.env.ADMIN_USERNAME || 'Admin',
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD
        });
        return res.json(authResponse(admin));
      }
      const user = await localStore.verifyUser(email, password);
      if (!user) {
        res.status(401);
        throw new Error('Invalid email or password');
      }
      return res.json(authResponse(user));
    }

    const user = wantsAdmin
      ? await findOrCreateAdminUser()
      : await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    res.json(authResponse(user));
  } catch (error) {
    next(error);
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!isMongoReady()) {
      const rawToken = await localStore.setResetToken(email);
      if (rawToken) {
        return res.json({ message: 'Password reset token generated', resetToken: rawToken });
      }
      return res.json({ message: 'If that email exists, a reset link has been generated.' });
    }

    const user = await User.findOne({ email });

    if (user) {
      const rawToken = crypto.randomBytes(24).toString('hex');
      user.resetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      user.resetTokenExpires = new Date(Date.now() + 20 * 60 * 1000);
      await user.save({ validateBeforeSave: false });

      // In production, send rawToken by email. Returning it here keeps the demo testable.
      return res.json({ message: 'Password reset token generated', resetToken: rawToken });
    }

    res.json({ message: 'If that email exists, a reset link has been generated.' });
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    if (!isMongoReady()) {
      const user = await localStore.resetPassword(req.body.token, req.body.password);
      if (!user) {
        res.status(400);
        throw new Error('Invalid or expired reset token');
      }
      return res.json(authResponse(user));
    }

    const hashed = crypto.createHash('sha256').update(req.body.token || '').digest('hex');
    const user = await User.findOne({
      resetToken: hashed,
      resetTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      res.status(400);
      throw new Error('Invalid or expired reset token');
    }

    user.password = req.body.password;
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    res.json(authResponse(user));
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, me, forgotPassword, resetPassword };
