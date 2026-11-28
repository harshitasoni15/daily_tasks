const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Attempt = require('../models/Attempt');
const AppError = require('../errors/AppError');

function validateAnswers(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some((field) => field !== 'answers') ||
      !Array.isArray(body.answers) || body.answers.length === 0) {
    throw new AppError(400, 'Submit a non-empty answers array and no other fields');
  }
  for (const answer of body.answers) {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer) ||
        Object.keys(answer).some((field) => !['questionId', 'selectedOption'].includes(field)) ||
        typeof answer.questionId !== 'string' || !mongoose.isObjectIdOrHexString(answer.questionId) ||
        typeof answer.selectedOption !== 'string' || !answer.selectedOption.trim()) {
      throw new AppError(400, 'Each answer requires a valid questionId and selectedOption');
    }
  }
}

async function submitAttempt(req, res, next) {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.examId)) {
      throw new AppError(400, 'Invalid exam ID');
    }
    validateAnswers(req.body);

    const exam = await Exam.findOne({ _id: req.params.examId, published: true })
      .select('+questions.correctOption');
    if (!exam) {
      throw new AppError(404, 'Exam not found');
    }

    const questions = new Map(exam.questions.map((question) => [question._id.toString(), question]));
    const seenQuestions = new Set();
    let score = 0;
    const answers = req.body.answers.map((answer) => {
      const questionId = answer.questionId;
      const question = questions.get(questionId);
      if (!question || seenQuestions.has(questionId)) {
        throw new AppError(400, 'Answers contain an unknown or duplicate question');
      }
      const selectedOption = answer.selectedOption.trim();
      if (!question.options.some((option) => option.key === selectedOption)) {
        throw new AppError(400, 'Selected option is not valid for this question');
      }
      seenQuestions.add(questionId);
      if (question.correctOption === selectedOption) score += 1;
      return { questionId, selectedOption };
    });

    const attempt = await Attempt.create({
      studentId: req.user.id,
      examId: exam._id,
      answers,
      score,
      totalQuestions: exam.questions.length
    });
    return res.status(201).json({ success: true, data: attempt });
  } catch (error) {
    return next(error);
  }
}

async function getAttempt(req, res, next) {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.attemptId)) {
      throw new AppError(400, 'Invalid attempt ID');
    }
    const filter = { _id: req.params.attemptId };
    if (req.user.role === 'student') {
      filter.studentId = req.user.id;
    }
    const attempt = await Attempt.findOne(filter).populate('examId', 'title');
    if (!attempt) {
      throw new AppError(404, 'Attempt not found');
    }
    return res.status(200).json({ success: true, data: attempt });
  } catch (error) {
    return next(error);
  }
}

module.exports = { submitAttempt, getAttempt, validateAnswers };

