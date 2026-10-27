const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { updateProfile } = require('../controllers/userController');

const router = express.Router();

router.patch('/me', protect, updateProfile);

module.exports = router;
