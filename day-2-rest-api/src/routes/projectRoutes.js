const express = require('express');
const {
  createProject,
  getProjects,
  getProjectById,
  submitFeedback
} = require('../controllers/projectController');

const router = express.Router();

router.route('/').post(createProject).get(getProjects);
router.get('/:id', getProjectById);
router.post('/:id/feedback', submitFeedback);

module.exports = router;

