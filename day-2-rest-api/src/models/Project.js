const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      minlength: 3,
      maxlength: 120
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
      trim: true,
      minlength: 10,
      maxlength: 5000
    },
    technologies: {
      type: [String],
      required: [true, 'At least one technology is required'],
      validate: {
        validator: (items) => items.length > 0 && items.every((item) => item.trim().length > 0),
        message: 'At least one non-empty technology is required'
      }
    },
    githubUrl: {
      type: String,
      required: [true, 'GitHub URL is required'],
      trim: true,
      validate: {
        validator: (value) => isHttpUrl(value),
        message: 'GitHub URL must be a valid HTTP or HTTPS URL'
      }
    },
    liveUrl: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: (value) => value === '' || isHttpUrl(value),
        message: 'Live URL must be a valid HTTP or HTTPS URL'
      }
    },
    owner: {
      type: String,
      required: [true, 'Project owner is required'],
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    published: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

projectSchema.virtual('feedback', {
  ref: 'Feedback',
  localField: '_id',
  foreignField: 'project'
});

module.exports = mongoose.model('Project', projectSchema);

