const { randomUUID } = require('crypto');

function submitQuizAttempt(req, res) {
  return res.status(201).json({
    success: true,
    message: 'Quiz attempt accepted',
    data: {
      attemptId: randomUUID(),
      ...req.body,
      submittedAt: new Date().toISOString()
    },
    requestId: req.requestId
  });
}

module.exports = { submitQuizAttempt };

