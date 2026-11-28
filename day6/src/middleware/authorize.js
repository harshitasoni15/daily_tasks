const AppError = require('../errors/AppError');

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to access this resource'));
    }
    return next();
  };
}

module.exports = authorize;

