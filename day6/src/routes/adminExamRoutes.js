const express = require('express');
const { listExams, createExam, updateExam } = require('../controllers/examController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin'));
router.get('/', listExams);
router.post('/', createExam);
router.put('/:examId', updateExam);

module.exports = router;

