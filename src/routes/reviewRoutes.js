const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const reviews = require('../controllers/reviewController');

const router = express.Router();

router.get('/', reviews.publicReviews);
router.get('/me', protect, reviews.myReview);
router.post('/', protect, reviews.addReview);
router.patch('/me', protect, reviews.updateReview);
router.delete('/me', protect, reviews.deleteOwnReview);

module.exports = router;
