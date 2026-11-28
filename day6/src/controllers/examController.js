const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const AppError = require('../errors/AppError');

const examFields = new Set(['title', 'published', 'questions']);

function validateExamBody(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'Invalid exam body');
  }

  if (partial && Object.keys(body).length === 0) {
    throw new AppError(400, 'Provide at least one exam field to update');
  }

  if (Object.keys(body).some((field) => !examFields.has(field))) {
    throw new AppError(400, 'Exam contains unsupported fields');
  }

  if (!partial || body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length < 2) {
      throw new AppError(400, 'Exam title must be at least 2 characters');
    }
  }

  if (body.published !== undefined && typeof body.published !== 'boolean') {
    throw new AppError(400, 'published must be a boolean');
  }

  if (!partial || body.questions !== undefined) {
    if (!Array.isArray(body.questions) || body.questions.length === 0) {
      throw new AppError(400, 'Exam must contain at least one question');
    }
    for (const question of body.questions) {
      if (!question || typeof question !== 'object' || Array.isArray(question) ||
          Object.keys(question).some((field) => !['prompt', 'options', 'correctOption'].includes(field)) ||
          typeof question.prompt !== 'string' || !question.prompt.trim() ||
          !Array.isArray(question.options) || question.options.length < 2 ||
          typeof question.correctOption !== 'string') {
        throw new AppError(400, 'Each question requires a prompt, at least two options, and a correctOption');
      }
      if (question.options.some((option) => !option || typeof option.key !== 'string' ||
          typeof option.text !== 'string' || !option.key.trim() || !option.text.trim())) {
        throw new AppError(400, 'Each option requires a key and text');
      }
      const optionKeys = question.options.map((option) => option.key.trim());
      if (new Set(optionKeys).size !== optionKeys.length || !optionKeys.includes(question.correctOption.trim())) {
        throw new AppError(400, 'Question option keys must be unique and include correctOption');
      }
    }
  }
}

function examOutput(exam) {
  return {
    id: exam.id || exam._id.toString(),
    title: exam.title,
    published: exam.published,
    questions: exam.questions.map((question) => ({
      id: question.id || question._id.toString(),
      prompt: question.prompt,
      options: question.options.map((option) => ({ key: option.key, text: option.text })),
      correctOption: question.correctOption
    }))
  };
}

async function getExamQuestions(req, res, next) {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.examId)) {
      throw new AppError(400, 'Invalid exam ID');
    }
    const exam = await Exam.findOne({ _id: req.params.examId, published: true });
    if (!exam) {
      throw new AppError(404, 'Exam not found');
    }
    const questions = exam.questions.map((question) => ({
      id: question.id || question._id.toString(),
      prompt: question.prompt,
      options: question.options.map((option) => ({ key: option.key, text: option.text }))
    }));
    return res.status(200).json({ success: true, data: { id: exam.id, title: exam.title, questions } });
  } catch (error) {
    return next(error);
  }
}

async function listExams(req, res, next) {
  try {
    const exams = await Exam.find().select('+questions.correctOption').sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: exams.map(examOutput) });
  } catch (error) {
    return next(error);
  }
}

async function createExam(req, res, next) {
  try {
    validateExamBody(req.body);
    const exam = await Exam.create(req.body);
    return res.status(201).json({ success: true, data: examOutput(exam) });
  } catch (error) {
    return next(error);
  }
}

async function updateExam(req, res, next) {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.examId)) {
      throw new AppError(400, 'Invalid exam ID');
    }
    validateExamBody(req.body, true);
    const exam = await Exam.findById(req.params.examId).select('+questions.correctOption');
    if (!exam) {
      throw new AppError(404, 'Exam not found');
    }
    if (req.body.title !== undefined) exam.title = req.body.title;
    if (req.body.published !== undefined) exam.published = req.body.published;
    if (req.body.questions !== undefined) exam.questions = req.body.questions;
    await exam.save();
    return res.status(200).json({ success: true, data: examOutput(exam) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getExamQuestions,
  listExams,
  createExam,
  updateExam,
  validateExamBody,
  examOutput
};

