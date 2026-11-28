const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const { register, login } = require('../src/controllers/authController');
const authenticate = require('../src/middleware/authenticate');
const authorize = require('../src/middleware/authorize');
const { hashPassword } = require('../src/utils/password');

jest.mock('../src/models/User', () => ({
  create: jest.fn(),
  findOne: jest.fn()
}));

function response() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

describe('authentication and authorization', () => {
  const secret = 'test-secret-with-more-than-thirty-two-characters';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = secret;
    process.env.JWT_EXPIRES_IN = '1h';
  });

  test('registers a student and never returns its password', async () => {
    const user = {
      id: 'user-id-1',
      name: 'New Student',
      email: 'new@example.test',
      role: 'student',
      password: 'hash-not-returned'
    };
    User.create.mockResolvedValue(user);
    const res = response();

    await register({
      body: { name: 'New Student', email: 'NEW@example.test', password: 'password-is-long-enough' }
    }, res, jest.fn());

    expect(User.create).toHaveBeenCalledWith({
      name: 'New Student',
      email: 'new@example.test',
      password: 'password-is-long-enough',
      role: 'student'
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].data.user).not.toHaveProperty('password');
  });

  test('rejects attempts to choose admin role on public registration', async () => {
    const next = jest.fn();
    await register({
      body: {
        name: 'New Student',
        email: 'new@example.test',
        password: 'password-is-long-enough',
        role: 'admin'
      }
    }, response(), next);

    expect(next.mock.calls[0][0]).toMatchObject({
      statusCode: 400,
      message: 'Request contains unsupported fields'
    });
    expect(User.create).not.toHaveBeenCalled();
  });

  test('logs in with a correct password and returns a JWT', async () => {
    const user = {
      id: 'student-123',
      name: 'Student',
      email: 'student@example.test',
      role: 'student',
      password: await hashPassword('password-is-long-enough')
    };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    const res = response();

    await login({ body: { email: user.email, password: 'password-is-long-enough' } }, res, jest.fn());

    const result = res.json.mock.calls[0][0].data;
    expect(res.status).toHaveBeenCalledWith(200);
    expect(result.user).not.toHaveProperty('password');
    expect(jwt.verify(result.token, secret)).toMatchObject({ sub: user.id, role: 'student' });
  });

  test('returns the same unauthorized error for unknown user or incorrect password', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const next = jest.fn();

    await login({
      body: { email: 'student@example.test', password: 'password-is-long-enough' }
    }, response(), next);

    expect(next.mock.calls[0][0]).toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password'
    });
  });

  test('rejects missing, invalid, expired, and invalid-role JWTs', () => {
    const next = jest.fn();
    const req = { get: () => undefined };
    authenticate(req, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(401);

    for (const token of [
      'not-a-token',
      jwt.sign({ sub: 'user-id', role: 'student' }, secret, { expiresIn: -1 }),
      jwt.sign({ sub: 'user-id', role: 'superadmin' }, secret)
    ]) {
      const requestNext = jest.fn();
      authenticate({ get: () => `Bearer ${token}` }, {}, requestNext);
      expect(requestNext.mock.calls[0][0].statusCode).toBe(401);
    }
  });

  test('attaches verified user claims and rejects unauthorized roles', () => {
    const token = jwt.sign({ sub: 'student-id', role: 'student' }, secret);
    const req = { get: () => `Bearer ${token}` };
    const next = jest.fn();
    authenticate(req, {}, next);
    expect(req.user).toEqual({ id: 'student-id', role: 'student' });
    expect(next).toHaveBeenCalledWith();

    const forbiddenNext = jest.fn();
    authorize('admin')(req, {}, forbiddenNext);
    expect(forbiddenNext.mock.calls[0][0].statusCode).toBe(403);

    const adminNext = jest.fn();
    authorize('admin')({ user: { role: 'admin' } }, {}, adminNext);
    expect(adminNext).toHaveBeenCalledWith();
  });
});

