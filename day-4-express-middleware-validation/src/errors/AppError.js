class AppError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
  }
}

class ValidationError extends AppError {
  constructor(errors) {
    super(400, 'Validation failed', errors);
    this.name = 'ValidationError';
  }
}

module.exports = { AppError, ValidationError };

