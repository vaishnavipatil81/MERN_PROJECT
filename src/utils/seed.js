require('dotenv').config();

const connectDB = require('../config/db');
const User = require('../models/User');
const SpeechSession = require('../models/SpeechSession');

async function seed() {
  await connectDB();
  await User.deleteMany({ email: 'demo@speakflow.ai' });
  const user = await User.create({
    name: 'Demo Speaker',
    email: 'demo@speakflow.ai',
    password: 'password123'
  });

  await SpeechSession.create([
    {
      user: user._id,
      title: 'Investor pitch practice',
      transcript: 'Today I want to share our product story and the market opportunity.',
      durationSeconds: 120,
      wpm: 132,
      confidenceScore: 78,
      eyeContactScore: 74,
      fillerCounts: { um: 2, uh: 1, like: 1, aaa: 0, basically: 0, literally: 0 },
      suggestions: ['Reduce filler words with short pauses.']
    },
    {
      user: user._id,
      title: 'Team update',
      transcript: 'We shipped the dashboard and improved onboarding conversion.',
      durationSeconds: 90,
      wpm: 148,
      confidenceScore: 86,
      eyeContactScore: 81,
      fillerCounts: { um: 1, uh: 0, like: 0, aaa: 0, basically: 1, literally: 0 },
      suggestions: ['Strong pace and clear delivery.']
    }
  ]);

  console.log('Seed complete: demo@speakflow.ai / password123');
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
