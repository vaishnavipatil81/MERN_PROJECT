const express = require('express');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const admin = require('../controllers/adminController');

const router = express.Router();

router.use(protect, adminOnly);
router.get('/overview', admin.overview);
router.delete('/users/:id', admin.deleteUser);
router.delete('/reviews/:id', admin.deleteReview);

module.exports = router;
