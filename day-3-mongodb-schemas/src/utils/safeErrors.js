function toSafeError(error) {
  if (error && error.code === 11000) {
    const duplicateError = new Error('A patient with this email already exists');
    duplicateError.status = 409;
    duplicateError.code = 'DUPLICATE_PATIENT_EMAIL';
    return duplicateError;
  }

  if (error && (error.name === 'ValidationError' || error.name === 'CastError')) {
    const validationError = new Error('Invalid data. Check required fields, formats, and allowed values');
    validationError.status = 400;
    validationError.code = 'VALIDATION_ERROR';
    return validationError;
  }

  return error;
}

module.exports = { toSafeError };
