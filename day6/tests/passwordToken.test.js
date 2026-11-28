const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Exam = require('../src/models/Exam');
const Attempt = require('../src/models/Attempt');
const { hashPassword, comparePassword } = require('../src/utils/password');
const { createToken } = require('../src/utils/token');

describe('password and JWT helpers', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters';
    process.env.JWT_EXPIRES_IN = '1h';
  });

  test('hashes a password and compares it without keeping plaintext', async () => {
    const plaintext = 'correct-horse-battery-staple';
    const hash = await hashPassword(plaintext);

    expect(hash).not.toBe(plaintext);
    expect(await comparePassword(plaintext, hash)).toBe(true);
    expect(await comparePassword('wrong-password', hash)).toBe(false);
  });

  test('user schema hides password from normal selections and JSON output', () => {
    expect(User.schema.path('password').options.select).toBe(false);

    const user = new User({
      name: 'Student Example',
      email: 'student@example.test',
      password: 'a-hashed-password-value',
      role: 'student'
    });
    expect(user.toJSON()).not.toHaveProperty('password');
    user.password = 'x'.repeat(73);
    expect(user.validateSync().errors.password).toBeDefined();
  });

  test('exam answer keys are hidden by default and attempts keep identity fields immutable', () => {
    expect(Exam.schema.path('questions').schema.path('correctOption').options.select).toBe(false);
    expect(Attempt.schema.path('studentId').options.immutable).toBe(true);
    expect(Attempt.schema.path('examId').options.immutable).toBe(true);
    expect(Attempt.schema.path('submittedAt').options.immutable).toBe(true);
  });

  test('JWT contains user ID and role and is configured to expire', () => {
    const token = createToken({ id: 'student-id-1', role: 'student' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    expect(payload.sub).toBe('student-id-1');
    expect(payload.role).toBe('student');
    expect(payload.exp - payload.iat).toBe(3600);
  });

  test('requires a sufficiently long JWT secret', () => {
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'too-short';

    expect(() => createToken({ id: 'id-1', role: 'student' }))
      .toThrow('JWT_SECRET must be configured with at least 32 characters');

    process.env.JWT_SECRET = originalSecret;
  });
});

