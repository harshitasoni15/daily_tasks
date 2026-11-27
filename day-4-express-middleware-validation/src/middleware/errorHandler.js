const { AppError } = require('../errors/AppError');

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let message = 'Internal server error';
  let errors = [];

  if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid request body';
    errors = [{ field: 'body', message: 'Request body must be valid JSON' }];
  } else if (error.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body too large';
    errors = [{ field: 'body', message: 'Request body exceeds the allowed size' }];
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    errors = error.errors;
  } else {
    console.error(JSON.stringify({
      requestId: req.requestId,
      error: error.name || 'Error',
      statusCode
    }));
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    requestId: req.requestId
  });
}

module.exports = errorHandler;

