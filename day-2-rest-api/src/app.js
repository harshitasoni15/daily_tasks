const express = require('express');
const projectRoutes = require('./routes/projectRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use('/api/projects', projectRoutes);
app.use(errorHandler);

module.exports = app;

