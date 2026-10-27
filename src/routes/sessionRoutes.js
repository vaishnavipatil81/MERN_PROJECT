const express = require('express');
const {
  listSessions,
  createSession,
  getSession,
  deleteSession,
  dashboard
} = require('../controllers/sessionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.get('/', listSessions);
router.post('/', createSession);
router.get('/dashboard', dashboard);
router.get('/:id', getSession);
router.delete('/:id', deleteSession);
router.post('/:id/delete', deleteSession);

module.exports = router;
