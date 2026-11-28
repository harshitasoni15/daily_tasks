const express = require('express');
const { getAttempt } = require('../controllers/attemptController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.get('/:attemptId', authenticate, getAttempt);

module.exports = router;

