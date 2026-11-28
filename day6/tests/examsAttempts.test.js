const mongoose = require('mongoose');
const Exam = require('../src/models/Exam');
const Attempt = require('../src/models/Attempt');
const { getExamQuestions } = require('../src/controllers/examController');
const { submitAttempt, getAttempt } = require('../src/controllers/attemptController');

jest.mock('../src/models/Exam', () => ({
  findOne: jest.fn()
}));
jest.mock('../src/models/Attempt', () => ({
  create: jest.fn(),
  findOne: jest.fn()
}));

function response() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

describe('exam delivery and attempt ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  test('question delivery omits answer keys', async () => {
    const questionId = new mongoose.Types.ObjectId();
    const examId = new mongoose.Types.ObjectId();
    Exam.findOne.mockResolvedValue({
      id: examId.toString(),
      title: 'Math Exam',
      questions: [{
        _id: questionId,
        prompt: 'What is 2 + 2?',
        options: [{ key: 'A', text: '3' }, { key: 'B', text: '4' }],
        correctOption: 'B'
      }]
    });
    const res = response();

    await getExamQuestions({ params: { examId: examId.toString() } }, res, jest.fn());

    expect(Exam.findOne).toHaveBeenCalledWith({ _id: examId.toString(), published: true });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('correctOption');
  });

  test('attempt submission uses authenticated student ID and stores score/audit data', async () => {
    const examId = new mongoose.Types.ObjectId();
    const questionId = new mongoose.Types.ObjectId();
    const exam = {
      _id: examId,
      questions: [{
        _id: questionId,
        correctOption: 'B',
        options: [{ key: 'A' }, { key: 'B' }]
      }]
    };
    Exam.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(exam) });
    const createdAttempt = { id: 'attempt-id', studentId: 'authenticated-student', examId };
    Attempt.create.mockResolvedValue(createdAttempt);
    const res = response();

    await submitAttempt({
      params: { examId: examId.toString() },
      user: { id: 'authenticated-student', role: 'student' },
      body: { answers: [{ questionId: questionId.toString(), selectedOption: 'B' }] }
    }, res, jest.fn());

    expect(Attempt.create).toHaveBeenCalledWith({
      studentId: 'authenticated-student',
      examId,
      answers: [{ questionId: questionId.toString(), selectedOption: 'B' }],
      score: 1,
      totalQuestions: 1
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('student attempt lookup scopes database query to authenticated student ID', async () => {
    const attemptId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId().toString();
    Attempt.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ id: attemptId.toString() })
    });
    const res = response();

    await getAttempt({
      params: { attemptId: attemptId.toString() },
      user: { id: studentId, role: 'student' }
    }, res, jest.fn());

    expect(Attempt.findOne).toHaveBeenCalledWith({ _id: attemptId.toString(), studentId });
  });

  test('admin attempt lookup is not limited to one student', async () => {
    const attemptId = new mongoose.Types.ObjectId();
    Attempt.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ id: attemptId.toString() })
    });

    await getAttempt({
      params: { attemptId: attemptId.toString() },
      user: { id: 'admin-id', role: 'admin' }
    }, response(), jest.fn());

    expect(Attempt.findOne).toHaveBeenCalledWith({ _id: attemptId.toString() });
  });
});

