const mongoose = require('mongoose');

const state = {
  ready: false,
  error: null
};

async function connectDB() {
  try {
    mongoose.set('bufferCommands', false);
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/speakflow_ai';
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    state.ready = true;
    state.error = null;
    console.log('MongoDB connected');
  } catch (error) {
    state.ready = false;
    state.error = error;
    console.error('MongoDB connection failed:', error.message);
    if (process.env.ALLOW_LOCAL_DEV_STORE === 'true') {
      console.error('Continuing with local development storage because ALLOW_LOCAL_DEV_STORE=true.');
      return;
    }
    console.error('Server stopped so auth data is not saved outside MongoDB.');
    process.exit(1);
  }
}

function isMongoReady() {
  return state.ready && mongoose.connection.readyState === 1;
}

function getMongoError() {
  return state.error;
}

module.exports = connectDB;
module.exports.isMongoReady = isMongoReady;
module.exports.getMongoError = getMongoError;
