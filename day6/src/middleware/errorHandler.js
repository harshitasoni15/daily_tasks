const AppError = require('../errors/AppError');

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists',
      errors: []
    });
  }

  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid request data',
      errors: []
    });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON request body',
      errors: []
    });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request body is too large',
      errors: []
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.errors
    });
  }

  console.error(JSON.stringify({
    error: error.name || 'Error',
    path: req.path,
    method: req.method
  }));
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    errors: []
  });
}

module.exports = errorHandler;

