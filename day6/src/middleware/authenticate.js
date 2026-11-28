const jwt = require('jsonwebtoken');
const AppError = require('../errors/AppError');
const { getJwtSecret } = require('../utils/token');

function authenticate(req, res, next) {
  const authorization = req.get('authorization');
  const match = authorization && authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return next(new AppError(401, 'Authentication required'));
  }

  try {
    const payload = jwt.verify(match[1], getJwtSecret(), { algorithms: ['HS256'] });
    if (!payload.sub || !['student', 'admin'].includes(payload.role)) {
      return next(new AppError(401, 'Invalid or expired token'));
    }

    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (error) {
    return next(new AppError(401, 'Invalid or expired token'));
  }
}

module.exports = authenticate;

