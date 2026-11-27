const express = require('express');
const validateQuizAttempt = require('../middleware/validateQuizAttempt');
const { submitQuizAttempt } = require('../controllers/quizAttemptController');

const router = express.Router();

router.post('/', validateQuizAttempt, submitQuizAttempt);

module.exports = router;

