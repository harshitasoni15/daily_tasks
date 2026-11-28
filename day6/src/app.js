const express = require('express');
const authRoutes = require('./routes/authRoutes');
const examRoutes = require('./routes/examRoutes');
const attemptRoutes = require('./routes/attemptRoutes');
const adminExamRoutes = require('./routes/adminExamRoutes');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./errors/AppError');
const app = express();

app.use(express.json({ limit: '32kb' }));
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/admin/exams', adminExamRoutes);
app.use((req, res, next) => next(new AppError(404, 'Route not found')));
app.use(errorHandler);

module.exports = app;

