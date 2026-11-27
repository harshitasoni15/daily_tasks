const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Project = require('../src/models/Project');
const Feedback = require('../src/models/Feedback');

let mongoServer;
let project;

const projectPayload = {
  title: 'Portfolio API',
  description: 'A project portfolio API built for a course assignment.',
  technologies: ['Node.js', 'Express', 'MongoDB'],
  githubUrl: 'https://github.com/example/portfolio-api',
  liveUrl: 'https://portfolio.example.com',
  owner: 'Student Developer'
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await Promise.all([Project.deleteMany({}), Feedback.deleteMany({})]);
  project = await Project.create(projectPayload);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Project portfolio API', () => {
  test('POST /api/projects creates a project with HTTP 201', async () => {
    const response = await request(app).post('/api/projects').send(projectPayload);
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data._id).toBeTruthy();
  });

  test('GET /api/projects returns only published projects with HTTP 200', async () => {
    await Project.create({ ...projectPayload, title: 'Draft project', published: false });
    const response = await request(app).get('/api/projects');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe(projectPayload.title);
  });

  test('GET /api/projects/:id returns details and feedback with HTTP 200', async () => {
    const response = await request(app).get(`/api/projects/${project._id}`);
    expect(response.status).toBe(200);
    expect(response.body.data._id).toBe(project._id.toString());
    expect(response.body.data.feedback).toEqual([]);
  });

  test('POST /api/projects/:id/feedback creates feedback with HTTP 201', async () => {
    const response = await request(app)
      .post(`/api/projects/${project._id}/feedback`)
      .send({ name: 'Visitor', email: 'visitor@example.com', rating: 5, comment: 'Great project!' });
    expect(response.status).toBe(201);
    expect(response.body.data.project).toBe(project._id.toString());
    expect(await Feedback.countDocuments({ project: project._id })).toBe(1);
  });

  test('returns HTTP 404 and saves no feedback when the project does not exist', async () => {
    const missingId = new mongoose.Types.ObjectId().toString();
    const response = await request(app)
      .post(`/api/projects/${missingId}/feedback`)
      .send({ name: 'Visitor', email: 'visitor@example.com', rating: 5, comment: 'Great project!' });
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Project not found',
      error: {
        code: 'PROJECT_NOT_FOUND',
        details: 'No project exists with the supplied ID'
      }
    });
    expect(await Feedback.countDocuments()).toBe(0);
  });

  test('returns HTTP 404 when a valid project ID does not exist', async () => {
    const missingId = new mongoose.Types.ObjectId().toString();
    const response = await request(app).get(`/api/projects/${missingId}`);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
  });

  test('returns HTTP 400 for malformed ID and invalid feedback without saving', async () => {
    const invalidIdResponse = await request(app).get('/api/projects/not-an-object-id');
    expect(invalidIdResponse.status).toBe(400);

    const invalidFeedbackResponse = await request(app)
      .post(`/api/projects/${project._id}/feedback`)
      .send({ name: 'Visitor', email: 'not-an-email', rating: 6, comment: 'x'.repeat(501) });
    expect(invalidFeedbackResponse.status).toBe(400);
    expect(await Feedback.countDocuments()).toBe(0);
  });

  test('returns an empty array when there are no published projects', async () => {
    await Project.deleteMany({});
    const response = await request(app).get('/api/projects');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  test('returns HTTP 400 for missing project fields and malformed URLs', async () => {
    const missingResponse = await request(app).post('/api/projects').send({ title: 'Missing fields' });
    expect(missingResponse.status).toBe(400);

    const urlResponse = await request(app)
      .post('/api/projects')
      .send({ ...projectPayload, githubUrl: 'not-a-url' });
    expect(urlResponse.status).toBe(400);
    expect(await Project.countDocuments({ title: 'Missing fields' })).toBe(0);
  });
});

