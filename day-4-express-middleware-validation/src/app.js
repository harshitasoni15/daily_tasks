const express = require('express');
const requestId = require('./middleware/requestId');
const requestLogger = require('./middleware/requestLogger');
const quizAttemptRoutes = require('./routes/quizAttemptRoutes');
const errorHandler = require('./middleware/errorHandler');
const { AppError } = require('./errors/AppError');

const app = express();

app.use(requestId);
app.use(requestLogger);
app.use(express.json({ limit: '16kb' }));
app.use('/api/quiz-attempts', quizAttemptRoutes);
app.use((req, res, next) => next(new AppError(404, 'Route not found')));
app.use(errorHandler);

module.exports = app;

