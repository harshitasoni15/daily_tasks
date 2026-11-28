const express = require('express');
const { getExamQuestions } = require('../controllers/examController');
const { submitAttempt } = require('../controllers/attemptController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.get('/:examId/questions', authenticate, authorize('student'), getExamQuestions);
router.post('/:examId/attempts', authenticate, authorize('student'), submitAttempt);

module.exports = router;

