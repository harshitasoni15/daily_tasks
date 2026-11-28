const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 10 },
    text: { type: String, required: true, trim: true, maxlength: 1000 }
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema({
  prompt: { type: String, required: true, trim: true, maxlength: 2000 },
  options: {
    type: [optionSchema],
    required: true,
    validate: {
      validator: (options) => options.length >= 2,
      message: 'A question must have at least two options'
    }
  },
  correctOption: { type: String, required: true, select: false }
});

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    published: { type: Boolean, default: true },
    questions: {
      type: [questionSchema],
      required: true,
      validate: {
        validator: (questions) => questions.length > 0,
        message: 'An exam must have at least one question'
      }
    }
  },
  { timestamps: true }
);

examSchema.pre('validate', function validateAnswerKeys() {
  for (const [index, question] of this.questions.entries()) {
    const optionKeys = question.options.map((option) => option.key);
    if (new Set(optionKeys).size !== optionKeys.length) {
      question.invalidate('options', `Question ${index + 1} has duplicate option keys`);
    }
    if (question.correctOption && !optionKeys.includes(question.correctOption)) {
      question.invalidate('correctOption', `Question ${index + 1} answer key must match an option key`);
    }
  }
});

module.exports = mongoose.model('Exam', examSchema);

