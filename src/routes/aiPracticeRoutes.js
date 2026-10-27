const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { TOPICS, fallbackQuestion, generatePracticeResponse } = require('../services/aiPracticeService');

const router = express.Router();

router.use(protect);

router.get('/topics', (req, res) => {
  res.json({ topics: TOPICS });
});

router.post('/question', (req, res) => {
  res.json({
    question: fallbackQuestion({
      mode: req.body.mode,
      difficulty: req.body.difficulty,
      answers: req.body.answers,
      resumeText: req.body.resumeText,
      topic: req.body.topic,
      setup: req.body.setup
    })
  });
});

router.post('/feedback', async (req, res, next) => {
  try {
    const feedback = await generatePracticeResponse({
      mode: req.body.mode,
      difficulty: req.body.difficulty,
      question: req.body.question,
      answer: req.body.answer,
      answers: req.body.answers,
      metrics: req.body.metrics,
      resumeText: req.body.resumeText,
      topic: req.body.topic,
      setup: req.body.setup
    });
    res.json({ feedback });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
