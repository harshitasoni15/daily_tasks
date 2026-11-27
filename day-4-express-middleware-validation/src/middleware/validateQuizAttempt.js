const { ValidationError } = require('../errors/AppError');

const allowedAttemptFields = new Set([
  'studentId',
  'courseId',
  'quizId',
  'answers',
  'timeTaken'
]);

const allowedAnswerFields = new Set(['questionId', 'selectedOption']);

function addUnexpectedFieldErrors(value, allowedFields, prefix, errors) {
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) {
      errors.push({ field: prefix ? `${prefix}.${field}` : field, message: 'Unexpected field' });
    }
  }
}

function validateQuizAttempt(req, res, next) {
  const errors = [];
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return next(new ValidationError([
      { field: 'body', message: 'Request body must be a JSON object' }
    ]));
  }

  addUnexpectedFieldErrors(body, allowedAttemptFields, '', errors);

  for (const field of ['studentId', 'courseId', 'quizId']) {
    if (typeof body[field] !== 'string' || body[field].trim().length === 0) {
      errors.push({ field, message: `${field} must be a non-empty string` });
    } else {
      body[field] = body[field].trim();
    }
  }

  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    errors.push({ field: 'answers', message: 'answers must be a non-empty array' });
  } else {
    body.answers.forEach((answer, index) => {
      const answerPath = `answers[${index}]`;
      if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
        errors.push({ field: answerPath, message: 'Each answer must be an object' });
        return;
      }

      addUnexpectedFieldErrors(answer, allowedAnswerFields, answerPath, errors);

      for (const field of ['questionId', 'selectedOption']) {
        if (typeof answer[field] !== 'string' || answer[field].trim().length === 0) {
          errors.push({
            field: `${answerPath}.${field}`,
            message: `${field} must be a non-empty string`
          });
        } else {
          answer[field] = answer[field].trim();
        }
      }
    });
  }

  if (!Number.isInteger(body.timeTaken) || body.timeTaken <= 0) {
    errors.push({ field: 'timeTaken', message: 'timeTaken must be a positive integer' });
  }

  if (errors.length > 0) {
    return next(new ValidationError(errors));
  }

  return next();
}

module.exports = validateQuizAttempt;

