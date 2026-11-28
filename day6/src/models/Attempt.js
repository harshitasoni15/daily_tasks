const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedOption: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      immutable: true
    },
    submittedAt: { type: Date, required: true, default: Date.now, immutable: true },
    answers: { type: [answerSchema], required: true, immutable: true },
    score: { type: Number, required: true, min: 0, immutable: true },
    totalQuestions: { type: Number, required: true, min: 1, immutable: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Attempt', attemptSchema);

