const mongoose = require('mongoose');

const speechSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      default: 'Practice session',
      trim: true
    },
    source: {
      type: String,
      enum: ['live', 'upload', 'ai-practice', 'speaking-practice'],
      default: 'live'
    },
    mode: {
      type: String,
      default: ''
    },
    difficulty: {
      type: String,
      default: 'Beginner'
    },
    questionCount: {
      type: Number,
      default: 0
    },
    videoUrl: String,
    transcript: {
      type: String,
      default: ''
    },
    durationSeconds: {
      type: Number,
      default: 0
    },
    wpm: {
      type: Number,
      default: 0
    },
    speedLabel: {
      type: String,
      enum: ['Too Slow', 'Normal', 'Too Fast'],
      default: 'Normal'
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    eyeContactScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    communicationScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    technicalKnowledgeScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    bodyLanguageScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    fluencyScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    speakingConsistency: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    grammarScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    clarityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    energyScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    problemSolvingScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    hrReadinessScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    internshipReadinessScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    overallPerformanceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    fillerCounts: {
      um: { type: Number, default: 0 },
      uh: { type: Number, default: 0 },
      like: { type: Number, default: 0 },
      aaa: { type: Number, default: 0 },
      basically: { type: Number, default: 0 },
      literally: { type: Number, default: 0 }
    },
    suggestions: {
      type: [String],
      default: []
    },
    strengths: {
      type: [String],
      default: []
    },
    improvementAreas: {
      type: [String],
      default: []
    },
    recommendedTopics: {
      type: [String],
      default: []
    },
    motivationalMessage: {
      type: String,
      default: ''
    },
    roadmap: {
      type: [String],
      default: []
    },
    recordingUrl: String,
    aiPracticeMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SpeechSession', speechSessionSchema);
