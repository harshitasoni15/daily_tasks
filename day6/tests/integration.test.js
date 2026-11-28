require('dotenv').config();
process.env.JWT_SECRET = 'integration-test-secret-with-at-least-thirty-two-characters';

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Exam = require('../src/models/Exam');
const Attempt = require('../src/models/Attempt');
const { comparePassword } = require('../src/utils/password');
const { createToken } = require('../src/utils/token');

let mongoServer;
let student;
let admin;
let exam;
let studentToken;
let adminToken;

const studentData = () => ({
  name: 'Student Example',
  email: `student-${new mongoose.Types.ObjectId()}@example.test`,
  password: 'student-password-123'
});

async function login(email, password) {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  return response.body.data && response.body.data.token;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Promise.all([User.init(), Exam.init(), Attempt.init()]);
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Exam.deleteMany({}), Attempt.deleteMany({})]);
  student = await User.create(studentData());
  admin = await User.create({
    name: 'Admin Example',
    email: `admin-${new mongoose.Types.ObjectId()}@example.test`,
    password: 'admin-password-123',
    role: 'admin'
  });
  exam = await Exam.create({
    title: 'HTTP Basics',
    published: true,
    questions: [{
      prompt: 'Which protocol is used for secure web traffic?',
      options: [{ key: 'A', text: 'HTTP' }, { key: 'B', text: 'HTTPS' }],
      correctOption: 'B'
    }]
  });
  studentToken = createToken(student);
  adminToken = createToken(admin);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Online exam authentication integration', () => {
  test('registers a student, stores only a hash, and logs in with a JWT', async () => {
    const data = studentData();
    const registration = await request(app).post('/api/auth/register').send(data);

    expect(registration.status).toBe(201);
    expect(registration.body.data.user.role).toBe('student');
    expect(registration.body.data.user).not.toHaveProperty('password');

    const stored = await User.findOne({ email: data.email }).select('+password');
    expect(stored.password).not.toBe(data.password);
    expect(await comparePassword(data.password, stored.password)).toBe(true);

    const loggedIn = await request(app).post('/api/auth/login')
      .send({ email: data.email, password: data.password });
    expect(loggedIn.status).toBe(200);
    expect(loggedIn.body.data.token).toBeTruthy();
    expect(loggedIn.body.data.user).not.toHaveProperty('password');
  });

  test('rejects admin role during public registration', async () => {
    const response = await request(app).post('/api/auth/register').send({
      ...studentData(),
      role: 'admin'
    });
    expect(response.status).toBe(400);
  });

  test('returns HTTP 401 for incorrect login credentials', async () => {
    const response = await request(app).post('/api/auth/login')
      .send({ email: student.email, password: 'incorrect-password' });
    expect(response.status).toBe(401);
  });

  test('rejects missing, invalid, and expired tokens with HTTP 401', async () => {
    const noToken = await request(app).get(`/api/exams/${exam.id}/questions`);
    const invalid = await request(app).get(`/api/exams/${exam.id}/questions`)
      .set('Authorization', 'Bearer invalid');
    const expiredToken = require('jsonwebtoken').sign(
      { sub: student.id, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: -1 }
    );
    const expired = await request(app).get(`/api/exams/${exam.id}/questions`)
      .set('Authorization', `Bearer ${expiredToken}`);

    expect([noToken.status, invalid.status, expired.status]).toEqual([401, 401, 401]);
  });

  test('allows students to see exam questions without disclosing answer keys', async () => {
    const response = await request(app).get(`/api/exams/${exam.id}/questions`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).not.toContain('correctOption');
    expect(response.body.data.questions[0].options).toHaveLength(2);
  });

  test('returns HTTP 403 to a student and allows an admin to manage exams', async () => {
    const forbidden = await request(app).get('/api/admin/exams')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(forbidden.status).toBe(403);

    const created = await request(app).post('/api/admin/exams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'New Exam',
        questions: [{
          prompt: 'Question?',
          options: [{ key: 'A', text: 'First' }, { key: 'B', text: 'Second' }],
          correctOption: 'A'
        }]
      });
    expect(created.status).toBe(201);
    expect(created.body.data.questions[0].correctOption).toBe('A');

    const listed = await request(app).get('/api/admin/exams')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listed.status).toBe(200);
  });

  test('stores submitted attempts against the authenticated student and permits owner access only', async () => {
    const questionId = exam.questions[0]._id.toString();
    const submitted = await request(app).post(`/api/exams/${exam.id}/attempts`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: [{ questionId, selectedOption: 'B' }] });
    expect(submitted.status).toBe(201);
    expect(submitted.body.data.studentId).toBe(student.id);
    expect(submitted.body.data.examId).toBe(exam.id);
    expect(submitted.body.data.score).toBe(1);
    expect(submitted.body.data.submittedAt).toBeTruthy();

    const ownAttempt = await request(app).get(`/api/attempts/${submitted.body.data._id}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(ownAttempt.status).toBe(200);

    const otherStudent = await User.create({
      name: 'Other Student',
      email: `other-${new mongoose.Types.ObjectId()}@example.test`,
      password: 'other-student-password'
    });
    const otherAttempt = await Attempt.create({
      studentId: otherStudent.id,
      examId: exam.id,
      answers: [{ questionId, selectedOption: 'A' }],
      score: 0,
      totalQuestions: 1
    });
    const denied = await request(app).get(`/api/attempts/${otherAttempt.id}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(denied.status).toBe(404);
  });

  test('admin can access another student attempt', async () => {
    const questionId = exam.questions[0]._id;
    const otherStudent = await User.create({
      name: 'Other Student',
      email: `other-${new mongoose.Types.ObjectId()}@example.test`,
      password: 'other-student-password'
    });
    const attempt = await Attempt.create({
      studentId: otherStudent.id,
      examId: exam.id,
      answers: [{ questionId, selectedOption: 'A' }],
      score: 0,
      totalQuestions: 1
    });
    const response = await request(app).get(`/api/attempts/${attempt.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.studentId).toBe(otherStudent.id);
  });
});

