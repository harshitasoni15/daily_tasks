const request = require('supertest');
const app = require('../src/app');
const errorHandler = require('../src/middleware/errorHandler');

const validPayload = () => ({
  studentId: 'STU101',
  courseId: 'COURSE101',
  quizId: 'QUIZ101',
  answers: [
    { questionId: 'Q1', selectedOption: 'B' },
    { questionId: 'Q2', selectedOption: 'A' }
  ],
  timeTaken: 300
});

describe('POST /api/quiz-attempts', () => {
  let infoSpy;
  let errorSpy;

  beforeEach(() => {
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('accepts a valid attempt and returns HTTP 201 with a request ID', async () => {
    const response = await request(app).post('/api/quiz-attempts').send(validPayload());

    expect(response.status).toBe(201);
    expect(response.headers['x-request-id']).toBe(response.body.requestId);
    expect(response.body.data).toMatchObject(validPayload());
    expect(response.body.data.attemptId).toBeTruthy();
  });

  test('generates a different request ID for each request and logs it', async () => {
    const first = await request(app).post('/api/quiz-attempts').send(validPayload());
    const second = await request(app).post('/api/quiz-attempts').send(validPayload());

    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
    expect(infoSpy).toHaveBeenCalledTimes(2);
    expect(infoSpy.mock.calls[0][0]).toContain(first.headers['x-request-id']);
    expect(infoSpy.mock.calls[1][0]).toContain(second.headers['x-request-id']);
  });

  test.each([
    ['studentId', (body) => { body.studentId = '  '; }],
    ['courseId', (body) => { delete body.courseId; }],
    ['quizId', (body) => { body.quizId = 42; }],
    ['answers', (body) => { body.answers = []; }],
    ['timeTaken', (body) => { body.timeTaken = 0; }],
    ['timeTaken', (body) => { body.timeTaken = 1.5; }],
    ['unexpected', (body) => { body.extra = true; }]
  ])('rejects invalid %s and includes the request ID', async (field, mutate) => {
    const payload = validPayload();
    mutate(payload);

    const response = await request(app).post('/api/quiz-attempts').send(payload);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: expect.any(String), message: expect.any(String) })
    ]));
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
  });

  test('rejects missing answer fields and unexpected answer fields', async () => {
    const response = await request(app)
      .post('/api/quiz-attempts')
      .send({
        ...validPayload(),
        answers: [{ questionId: 'Q1', unexpected: 'value' }]
      });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(expect.arrayContaining([
      { field: 'answers[0].selectedOption', message: 'selectedOption must be a non-empty string' },
      { field: 'answers[0].unexpected', message: 'Unexpected field' }
    ]));
  });

  test('returns a traced error for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/quiz-attempts')
      .set('Content-Type', 'application/json')
      .send('{"studentId":');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Invalid request body',
      errors: [{ field: 'body', message: 'Request body must be valid JSON' }]
    });
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
  });

  test('returns a generic 500 response without exposing internal details', () => {
    const req = { requestId: 'request-test-id' };
    const res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    errorHandler(new Error('private database connection detail'), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal server error',
      errors: [],
      requestId: 'request-test-id'
    });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('private database connection detail');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('request-test-id'));
  });
});

