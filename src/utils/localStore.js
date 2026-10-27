const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'local-dev.json');

const DEFAULT_DATA = {
  users: [],
  sessions: []
};

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { ...DEFAULT_DATA };
    return { ...DEFAULT_DATA, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) };
  } catch (error) {
    return { ...DEFAULT_DATA };
  }
}

function writeData(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function publicUser(user) {
  if (!user) return null;
  return {
    _id: user._id,
    id: user._id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    bio: user.bio || '',
    communicationGoals: user.communicationGoals || [],
    interests: user.interests || [],
    language: user.language || 'English',
    skillLevel: user.skillLevel || 'Beginner',
    preferences: user.preferences || { voiceFeedback: true, darkMode: true },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function attachUserMethods(user) {
  const safeUser = publicUser(user);
  safeUser.save = async () => updateUser(safeUser._id, safeUser);
  return safeUser;
}

async function createUser({ name, email, password }) {
  const data = readData();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (data.users.some((user) => user.email === normalizedEmail)) {
    const error = new Error('Email already registered');
    error.statusCode = 409;
    throw error;
  }

  const now = new Date().toISOString();
  const user = {
    _id: crypto.randomUUID(),
    name: String(name || '').trim(),
    email: normalizedEmail,
    password: await bcrypt.hash(password, 12),
    avatarUrl: '',
    bio: '',
    communicationGoals: [],
    interests: [],
    language: 'English',
    skillLevel: 'Beginner',
    preferences: { voiceFeedback: true, darkMode: true },
    createdAt: now,
    updatedAt: now
  };

  data.users.push(user);
  writeData(data);
  return publicUser(user);
}

async function verifyUser(email, password) {
  const data = readData();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = data.users.find((item) => item.email === normalizedEmail);
  if (!user || !(await bcrypt.compare(password, user.password))) return null;
  return publicUser(user);
}

async function findOrCreateAdmin({ name, email, password }) {
  const data = readData();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  let user = data.users.find((item) => item.email === normalizedEmail);
  if (!user) {
    const now = new Date().toISOString();
    user = {
      _id: crypto.randomUUID(),
      name: String(name || 'Admin').trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      avatarUrl: '',
      bio: 'SpeakFlow administrator',
      communicationGoals: [],
      interests: [],
      language: 'English',
      skillLevel: 'Advanced',
      preferences: { voiceFeedback: true, darkMode: true },
      createdAt: now,
      updatedAt: now
    };
    data.users.push(user);
    writeData(data);
  } else if (!(await bcrypt.compare(password, user.password))) {
    user.password = await bcrypt.hash(password, 12);
    user.name = String(name || user.name || 'Admin').trim();
    user.updatedAt = new Date().toISOString();
    writeData(data);
  }
  return publicUser(user);
}

async function findUserById(id) {
  const data = readData();
  const user = data.users.find((item) => item._id === id);
  return user ? attachUserMethods(user) : null;
}

async function findUserByEmail(email) {
  const data = readData();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = data.users.find((item) => item.email === normalizedEmail);
  return user ? publicUser(user) : null;
}

async function updateUser(id, updates) {
  const data = readData();
  const index = data.users.findIndex((user) => user._id === id);
  if (index === -1) return null;

  const current = data.users[index];
  data.users[index] = {
    ...current,
    ...updates,
    _id: current._id,
    email: current.email,
    password: current.password,
    updatedAt: new Date().toISOString()
  };
  writeData(data);
  return attachUserMethods(data.users[index]);
}

async function setResetToken(email) {
  const data = readData();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const index = data.users.findIndex((user) => user.email === normalizedEmail);
  if (index === -1) return null;

  const rawToken = crypto.randomBytes(24).toString('hex');
  data.users[index].resetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  data.users[index].resetTokenExpires = Date.now() + 20 * 60 * 1000;
  writeData(data);
  return rawToken;
}

async function resetPassword(token, password) {
  const data = readData();
  const hashed = crypto.createHash('sha256').update(token || '').digest('hex');
  const index = data.users.findIndex(
    (user) => user.resetToken === hashed && Number(user.resetTokenExpires || 0) > Date.now()
  );
  if (index === -1) return null;

  data.users[index].password = await bcrypt.hash(password, 12);
  delete data.users[index].resetToken;
  delete data.users[index].resetTokenExpires;
  data.users[index].updatedAt = new Date().toISOString();
  writeData(data);
  return publicUser(data.users[index]);
}

async function listSessions(userId) {
  const data = readData();
  return data.sessions
    .filter((session) => session.user === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function createSession(userId, payload) {
  const data = readData();
  const now = new Date().toISOString();
  const session = {
    ...payload,
    _id: crypto.randomUUID(),
    user: userId,
    createdAt: now,
    updatedAt: now
  };
  data.sessions.push(session);
  writeData(data);
  return session;
}

async function getSession(userId, sessionId) {
  const data = readData();
  return data.sessions.find((session) => session._id === sessionId && session.user === userId) || null;
}

async function deleteSession(userId, sessionId) {
  const data = readData();
  const before = data.sessions.length;
  data.sessions = data.sessions.filter((session) => {
    const sessionMatches = String(session._id || session.id) === String(sessionId);
    const userMatches = String(session.user || session.userId) === String(userId);
    return !(sessionMatches && userMatches);
  });
  if (data.sessions.length === before) return false;
  writeData(data);
  return true;
}

async function adminOverview() {
  const data = readData();
  const users = data.users
    .map(publicUser)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const userMap = new Map(users.map((user) => [String(user._id), user]));
  const sessions = data.sessions
    .map((session) => ({
      ...session,
      user: userMap.get(String(session.user || session.userId)) || null
    }))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return {
    stats: { users: users.length, sessions: sessions.length, groups: 0, reviews: 0 },
    users: users.slice(0, 50),
    sessions: sessions.slice(0, 50),
    groups: [],
    reviews: [],
    meta: { mode: 'local' }
  };
}

async function adminDeleteUser(userId) {
  const data = readData();
  const before = data.users.length;
  data.users = data.users.filter((user) => String(user._id) !== String(userId));
  if (data.users.length === before) return false;
  data.sessions = data.sessions.filter((session) => String(session.user || session.userId) !== String(userId));
  writeData(data);
  return true;
}

module.exports = {
  createUser,
  verifyUser,
  findOrCreateAdmin,
  findUserById,
  findUserByEmail,
  updateUser,
  setResetToken,
  resetPassword,
  listSessions,
  createSession,
  getSession,
  deleteSession,
  adminOverview,
  adminDeleteUser
};
