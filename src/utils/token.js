const jwt = require('jsonwebtoken');

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

function isAdminUser(user = {}) {
  return Boolean(process.env.ADMIN_EMAIL && String(user.email || '').toLowerCase() === String(process.env.ADMIN_EMAIL).toLowerCase());
}

function authResponse(user) {
  return {
    token: signToken(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      communicationGoals: user.communicationGoals,
      interests: user.interests,
      language: user.language,
      skillLevel: user.skillLevel,
      preferences: user.preferences,
      isAdmin: isAdminUser(user)
    }
  };
}

module.exports = { signToken, authResponse, isAdminUser };
