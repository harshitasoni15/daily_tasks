const User = require('../models/User');
const AppError = require('../errors/AppError');
const { comparePassword } = require('../utils/password');
const { createToken } = require('../utils/token');

const registrationFields = new Set(['name', 'email', 'password']);

function validateCredentials(body, registration = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'Invalid request body');
  }

  const allowedFields = registration ? registrationFields : new Set(['email', 'password']);
  const unknownFields = Object.keys(body).filter((field) => !allowedFields.has(field));
  if (unknownFields.length > 0) {
    throw new AppError(400, 'Request contains unsupported fields');
  }

  const errors = [];
  if (registration && (typeof body.name !== 'string' || body.name.trim().length < 2)) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
  }
  if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    errors.push({ field: 'email', message: 'A valid email is required' });
  }
  if (typeof body.password !== 'string' || body.password.length < 12 ||
      Buffer.byteLength(body.password, 'utf8') > 72) {
    errors.push({ field: 'password', message: 'Password must be 12 or more characters and no more than 72 UTF-8 bytes' });
  }
  if (errors.length > 0) {
    throw new AppError(400, 'Validation failed', errors);
  }
}

function publicUser(user) {
  return { id: user.id || user._id.toString(), name: user.name, email: user.email, role: user.role };
}

async function register(req, res, next) {
  try {
    validateCredentials(req.body, true);
    const user = await User.create({
      name: req.body.name.trim(),
      email: req.body.email.trim().toLowerCase(),
      password: req.body.password,
      role: 'student'
    });
    return res.status(201).json({ success: true, data: { user: publicUser(user) } });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    validateCredentials(req.body);
    const user = await User.findOne({ email: req.body.email.trim().toLowerCase() }).select('+password');
    if (!user || !(await comparePassword(req.body.password, user.password))) {
      throw new AppError(401, 'Invalid email or password');
    }

    const token = createToken(user);
    return res.status(200).json({
      success: true,
      data: { user: publicUser(user), token, expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { register, login, validateCredentials };

