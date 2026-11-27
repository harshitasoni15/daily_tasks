const requestIdMiddleware = require('../src/middleware/requestId');
const requestLogger = require('../src/middleware/requestLogger');
const validateQuizAttempt = require('../src/middleware/validateQuizAttempt');
const errorHandler = require('../src/middleware/errorHandler');
const { submitQuizAttempt } = require('../src/controllers/quizAttemptController');
const { ValidationError } = require('../src/errors/AppError');

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

function runValidation(body) {
  const next = jest.fn();
  validateQuizAttempt({ body }, {}, next);
  return next.mock.calls[0][0];
}

function mockResponse() {
  return {
    headersSent: false,
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
}

describe('quiz attempt middleware and controller units', () => {
  test('generates a unique request ID and sets the response header', () => {
    const firstReq = {};
    const secondReq = {};
    const firstRes = mockResponse();
    const secondRes = mockResponse();
    const next = jest.fn();

    requestIdMiddleware(firstReq, firstRes, next);
    requestIdMiddleware(secondReq, secondRes, next);

    expect(firstReq.requestId).toBeTruthy();
    expect(firstReq.requestId).not.toBe(secondReq.requestId);
    expect(firstRes.setHeader).toHaveBeenCalledWith('X-Request-ID', firstReq.requestId);
    expect(next).toHaveBeenCalledTimes(2);
  });

  test('logs the request ID, method, path, status, and duration', () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    const req = { requestId: 'trace-123', method: 'POST', path: '/api/quiz-attempts' };
    const res = { statusCode: 201, once: jest.fn() };
    const next = jest.fn();

    requestLogger(req, res, next);
    const finishHandler = res.once.mock.calls[0][1];
    finishHandler();

    expect(next).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('"requestId":"trace-123"'));
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('"statusCode":201'));
    infoSpy.mockRestore();
  });

  test('accepts and trims a valid quiz attempt', () => {
    const payload = validPayload();
    payload.studentId = ' STU101 ';
    payload.answers[0].selectedOption = ' B ';

    expect(runValidation(payload)).toBeUndefined();
    expect(payload.studentId).toBe('STU101');
    expect(payload.answers[0].selectedOption).toBe('B');
  });

  test.each([
    ['studentId', (body) => { body.studentId = ' '; }],
    ['courseId', (body) => { delete body.courseId; }],
    ['quizId', (body) => { body.quizId = 42; }],
    ['answers', (body) => { body.answers = []; }],
    ['timeTaken', (body) => { body.timeTaken = 0; }],
    ['timeTaken', (body) => { body.timeTaken = 1.5; }],
    ['unexpected', (body) => { body.extra = true; }]
  ])('rejects invalid %s values', (field, mutate) => {
    const payload = validPayload();
    mutate(payload);

    const error = runValidation(payload);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.errors.length).toBeGreaterThan(0);
    expect(error.errors[0].field).toBeTruthy();
  });

  test('rejects missing answer fields and unexpected answer fields', () => {
    const error = runValidation({
      ...validPayload(),
      answers: [{ questionId: 'Q1', unexpected: 'value' }]
    });

    expect(error.errors).toEqual(expect.arrayContaining([
      { field: 'answers[0].selectedOption', message: 'selectedOption must be a non-empty string' },
      { field: 'answers[0].unexpected', message: 'Unexpected field' }
    ]));
  });

  test('controller returns a created attempt with the same request ID', () => {
    const res = mockResponse();
    submitQuizAttempt({ body: validPayload(), requestId: 'trace-123' }, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      success: true,
      requestId: 'trace-123',
      data: validPayload()
    });
  });

  test('central error handler returns safe request-traced responses', () => {
    const res = mockResponse();
    const next = jest.fn();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(new Error('private database connection detail'), { requestId: 'trace-500' }, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0]).toEqual({
      success: false,
      message: 'Internal server error',
      errors: [],
      requestId: 'trace-500'
    });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('private database connection detail');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('trace-500'));
    errorSpy.mockRestore();
  });

  test('central error handler recognizes malformed JSON and validation errors', () => {
    const malformedJsonRes = mockResponse();
    errorHandler({ type: 'entity.parse.failed' }, { requestId: 'trace-json' }, malformedJsonRes, jest.fn());
    expect(malformedJsonRes.status).toHaveBeenCalledWith(400);
    expect(malformedJsonRes.json.mock.calls[0][0]).toMatchObject({
      message: 'Invalid request body',
      requestId: 'trace-json'
    });

    const validationRes = mockResponse();
    errorHandler(
      new ValidationError([{ field: 'timeTaken', message: 'timeTaken must be a positive integer' }]),
      { requestId: 'trace-validation' },
      validationRes,
      jest.fn()
    );
    expect(validationRes.status).toHaveBeenCalledWith(400);
    expect(validationRes.json.mock.calls[0][0]).toMatchObject({
      message: 'Validation failed',
      requestId: 'trace-validation',
      errors: [{ field: 'timeTaken', message: 'timeTaken must be a positive integer' }]
    });
  });
});

