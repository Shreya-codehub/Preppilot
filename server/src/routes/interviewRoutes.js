const express = require('express');
const { 
  startInterviewSession, 
  getSessionById, 
  submitAnswer, 
  getUserSessions ,
  completeInterviewSession
} = require('../controllers/interviewController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// POST /api/interview/start (Upload resume & generate questions)
router.post('/start', protect, upload.single('resume'), startInterviewSession);

// GET /api/interview/history (Get all user interview sessions)
router.get('/history', protect, getUserSessions);

// GET /api/interview/:id (Get specific session details)
router.get('/:id', protect, getSessionById);

// POST /api/interview/:id/answer (Submit answer & get Gemini feedback)
router.post('/:id/answer', protect, submitAnswer);

// POST /api/interview/:id/complete (Complete interview session)
router.post('/:id/complete', protect, completeInterviewSession);

module.exports = router;