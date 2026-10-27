const SpeechSession = require('../models/SpeechSession');
const { cloudinary } = require('../config/cloudinary');
const { countFillers, speedLabel, createSuggestions } = require('../utils/analysis');

function uploadBufferToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'speakflow-ai/videos',
        resource_type: 'video',
        public_id: `${Date.now()}-${file.originalname.replace(/\.[^.]+$/, '')}`
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(file.buffer);
  });
}

function hasCloudinaryConfig() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

async function uploadVideo(req, res, next) {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Video file is required');
    }

    const transcript = req.body.transcript || '';
    const fillerCounts = countFillers(transcript);
    const wpm = Number(req.body.wpm || 0);
    const eyeContactScore = Number(req.body.eyeContactScore || 0);
    const confidenceScore = Number(req.body.confidenceScore || 0);
    let videoUrl = `local-upload://${req.file.originalname}`;
    let uploadMode = 'local-report-only';

    if (hasCloudinaryConfig()) {
      const uploaded = await uploadBufferToCloudinary(req.file);
      videoUrl = uploaded.secure_url;
      uploadMode = 'cloudinary';
    }

    const session = await SpeechSession.create({
      user: req.user._id,
      title: req.body.title || req.file.originalname,
      source: 'upload',
      videoUrl,
      transcript,
      durationSeconds: Number(req.body.durationSeconds || 0),
      wpm,
      speedLabel: speedLabel(wpm),
      confidenceScore,
      eyeContactScore,
      fillerCounts,
      suggestions: createSuggestions({ fillerCounts, wpm, eyeContactScore, confidenceScore })
    });

    res.status(201).json({ session, uploadMode });
  } catch (error) {
    next(error);
  }
}

module.exports = { uploadVideo };
