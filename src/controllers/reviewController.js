const Review = require('../models/Review');
const { isMongoReady } = require('../config/db');

function requireMongo() {
  if (isMongoReady()) return;
  const error = new Error('Reviews need MongoDB');
  error.statusCode = 503;
  throw error;
}

function cleanReviewBody(body = {}) {
  const rating = Number(body.rating);
  const comment = String(body.comment || '').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    const error = new Error('Rating is required from 1 to 5');
    error.statusCode = 400;
    throw error;
  }
  if (!comment) {
    const error = new Error('Review comment is required');
    error.statusCode = 400;
    throw error;
  }
  return { rating, comment };
}

function formatPublicReview(review) {
  const user = review.userId || {};
  return {
    _id: review._id,
    name: user.name || review.name,
    rating: review.rating,
    comment: review.comment,
    approved: review.approved,
    createdAt: review.createdAt,
    avatarUrl: user.avatarUrl || '',
    bio: user.bio || '',
    skillLevel: user.skillLevel || 'Student',
    language: user.language || 'English'
  };
}

async function publicReviews(req, res, next) {
  try {
    if (!isMongoReady()) return res.json({ reviews: [] });
    const reviews = await Review.find({ approved: true })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('userId', 'name avatarUrl bio skillLevel language')
      .lean();
    res.json({ reviews: reviews.map(formatPublicReview) });
  } catch (error) {
    next(error);
  }
}

async function myReview(req, res, next) {
  try {
    requireMongo();
    const review = await Review.findOne({ userId: req.user._id });
    res.json({ review });
  } catch (error) {
    next(error);
  }
}

async function addReview(req, res, next) {
  try {
    requireMongo();
    const existing = await Review.findOne({ userId: req.user._id });
    if (existing) {
      res.status(409);
      throw new Error('You already submitted a review');
    }
    const body = cleanReviewBody(req.body);
    const review = await Review.create({
      userId: req.user._id,
      name: req.user.name,
      rating: body.rating,
      comment: body.comment
    });
    res.status(201).json({ review });
  } catch (error) {
    next(error);
  }
}

async function updateReview(req, res, next) {
  try {
    requireMongo();
    const body = cleanReviewBody(req.body);
    const review = await Review.findOneAndUpdate(
      { userId: req.user._id },
      { rating: body.rating, comment: body.comment, name: req.user.name, approved: true },
      { new: true }
    );
    if (!review) {
      res.status(404);
      throw new Error('Review not found');
    }
    res.json({ review });
  } catch (error) {
    next(error);
  }
}

async function deleteOwnReview(req, res, next) {
  try {
    requireMongo();
    await Review.deleteOne({ userId: req.user._id });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

module.exports = { publicReviews, myReview, addReview, updateReview, deleteOwnReview };
