const Project = require('../models/Project');
const Feedback = require('../models/Feedback');

class RequestError extends Error {
  constructor(status, message, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isValidHttpUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || value === '' ||
      (Array.isArray(value) && value.length === 0);
  });

  if (missing.length > 0) {
    throw new RequestError(
      400,
      'Missing required fields',
      'MISSING_REQUIRED_FIELDS',
      `Required fields: ${missing.join(', ')}`
    );
  }
}

function validateProjectBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new RequestError(400, 'Invalid request body', 'INVALID_REQUEST_BODY', 'A JSON object is required');
  }

  requireFields(body, ['title', 'description', 'technologies', 'githubUrl', 'owner']);

  if (!Array.isArray(body.technologies) || body.technologies.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new RequestError(400, 'Invalid technologies', 'INVALID_TECHNOLOGIES', 'Technologies must be a non-empty array of strings');
  }
  if (!isValidHttpUrl(body.githubUrl)) {
    throw new RequestError(400, 'Invalid URL', 'INVALID_URL', 'githubUrl must be a valid HTTP or HTTPS URL');
  }
  if (body.liveUrl !== undefined && body.liveUrl !== '' && !isValidHttpUrl(body.liveUrl)) {
    throw new RequestError(400, 'Invalid URL', 'INVALID_URL', 'liveUrl must be a valid HTTP or HTTPS URL');
  }
}

function validateId(id) {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new RequestError(400, 'Invalid project ID', 'INVALID_PROJECT_ID', 'Project ID must be a valid MongoDB ObjectId');
  }
}

function sendRequestError(error, res) {
  if (error instanceof RequestError) {
    res.status(error.status).json({
      success: false,
      message: error.message,
      error: { code: error.code, details: error.details }
    });
    return true;
  }
  return false;
}

async function createProject(req, res, next) {
  try {
    validateProjectBody(req.body);
    const project = await Project.create({
      title: req.body.title,
      description: req.body.description,
      technologies: req.body.technologies,
      githubUrl: req.body.githubUrl,
      liveUrl: req.body.liveUrl || '',
      owner: req.body.owner,
      published: req.body.published === undefined ? true : req.body.published
    });
    return res.status(201).json({ success: true, data: project });
  } catch (error) {
    if (sendRequestError(error, res)) return;
    return next(error);
  }
}

async function getProjects(req, res, next) {
  try {
    const projects = await Project.find({ published: true }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: projects });
  } catch (error) {
    return next(error);
  }
}

async function getProjectById(req, res, next) {
  try {
    validateId(req.params.id);
    const project = await Project.findById(req.params.id).populate('feedback');
    if (!project) {
      throw new RequestError(404, 'Project not found', 'PROJECT_NOT_FOUND', 'No project exists with the supplied ID');
    }
    return res.status(200).json({ success: true, data: project });
  } catch (error) {
    if (sendRequestError(error, res)) return;
    return next(error);
  }
}

function validateFeedbackBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new RequestError(400, 'Invalid request body', 'INVALID_REQUEST_BODY', 'A JSON object is required');
  }
  requireFields(body, ['name', 'email', 'rating', 'comment']);
  if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    throw new RequestError(400, 'Invalid email', 'INVALID_EMAIL', 'A valid email address is required');
  }
  if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
    throw new RequestError(400, 'Invalid rating', 'INVALID_RATING', 'Rating must be a whole number between 1 and 5');
  }
  if (typeof body.comment !== 'string' || body.comment.length > 500) {
    throw new RequestError(400, 'Invalid comment', 'INVALID_COMMENT', 'Comment must be a string of no more than 500 characters');
  }
}

async function submitFeedback(req, res, next) {
  try {
    validateId(req.params.id);
    validateFeedbackBody(req.body);

    const project = await Project.findById(req.params.id).select('_id');
    if (!project) {
      throw new RequestError(404, 'Project not found', 'PROJECT_NOT_FOUND', 'No project exists with the supplied ID');
    }

    const feedback = await Feedback.create({
      project: project._id,
      name: req.body.name,
      email: req.body.email,
      rating: req.body.rating,
      comment: req.body.comment
    });
    return res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    if (sendRequestError(error, res)) return;
    return next(error);
  }
}

module.exports = { createProject, getProjects, getProjectById, submitFeedback };

