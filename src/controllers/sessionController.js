const SpeechSession = require('../models/SpeechSession');
const { countFillers, speedLabel, createSuggestions } = require('../utils/analysis');
const { isMongoReady } = require('../config/db');
const localStore = require('../utils/localStore');

async function listSessions(req, res, next) {
  try {
    if (!isMongoReady()) {
      const sessions = await localStore.listSessions(req.user._id);
      return res.json({ sessions });
    }

    const sessions = await SpeechSession.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ sessions });
  } catch (error) {
    next(error);
  }
}

async function createSession(req, res, next) {
  try {
    const fillerCounts = req.body.fillerCounts || countFillers(req.body.transcript);
    const computedSpeedLabel = req.body.speedLabel || speedLabel(Number(req.body.wpm || 0));
    const payload = {
      ...req.body,
      user: req.user._id,
      fillerCounts,
      speedLabel: computedSpeedLabel,
      suggestions:
        req.body.suggestions ||
        createSuggestions({
          fillerCounts,
          wpm: Number(req.body.wpm || 0),
          eyeContactScore: Number(req.body.eyeContactScore || 0),
          confidenceScore: Number(req.body.confidenceScore || 0)
        })
    };

    if (!isMongoReady()) {
      const session = await localStore.createSession(req.user._id, payload);
      return res.status(201).json({ session });
    }

    const session = await SpeechSession.create(payload);
    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
}

async function getSession(req, res, next) {
  try {
    if (!isMongoReady()) {
      const session = await localStore.getSession(req.user._id, req.params.id);
      if (!session) {
        res.status(404);
        throw new Error('Session not found');
      }
      return res.json({ session });
    }

    const session = await SpeechSession.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) {
      res.status(404);
      throw new Error('Session not found');
    }
    res.json({ session });
  } catch (error) {
    next(error);
  }
}

async function deleteSession(req, res, next) {
  try {
    const sessionId = String(req.params.id || '').trim();
    if (!isMongoReady()) {
      const deleted = await localStore.deleteSession(req.user._id, sessionId);
      if (!deleted) {
        res.status(404);
        throw new Error('Session not found');
      }
      return res.json({ ok: true });
    }

    const deleted = await SpeechSession.findOneAndDelete({
      _id: sessionId,
      user: req.user._id
    });
    if (!deleted) {
      res.status(404);
      throw new Error('Session not found');
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function dashboard(req, res, next) {
  try {
    const sessions = isMongoReady()
      ? await SpeechSession.find({ user: req.user._id }).sort({ createdAt: 1 })
      : (await localStore.listSessions(req.user._id)).reverse();
    const totalSpeeches = sessions.length;
    const averageConfidence = totalSpeeches
      ? Math.round(sessions.reduce((sum, session) => sum + Number(session.confidenceScore || 0), 0) / totalSpeeches)
      : 0;
    const totalFillers = sessions.reduce(
      (sum, session) => sum + Object.values(session.fillerCounts || {}).reduce((a, b) => a + b, 0),
      0
    );
    const averageEyeContact = totalSpeeches
      ? Math.round(sessions.reduce((sum, session) => sum + Number(session.eyeContactScore || 0), 0) / totalSpeeches)
      : 0;

    res.json({
      stats: { totalSpeeches, averageConfidence, totalFillers, averageEyeContact },
      progress: sessions.map((session) => ({
        date: session.createdAt,
        confidenceScore: Number(session.confidenceScore || session.communicationScore || 0),
        wpm: Number(session.wpm || 0),
        eyeContactScore: Number(session.eyeContactScore || session.bodyLanguageScore || 0),
        fillers: Object.values(session.fillerCounts || {}).reduce((a, b) => a + b, 0)
      }))
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { listSessions, createSession, getSession, deleteSession, dashboard };
