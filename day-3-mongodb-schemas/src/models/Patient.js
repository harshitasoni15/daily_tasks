const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [120, 'Full name must not exceed 120 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email must not exceed 254 characters'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email must be valid']
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      minlength: [7, 'Phone number must be at least 7 characters'],
      maxlength: [24, 'Phone number must not exceed 24 characters'],
      match: [/^\+?[0-9()\-\s]+$/, 'Phone number contains invalid characters']
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: (value) => value === undefined || value <= new Date(),
        message: 'Date of birth cannot be in the future'
      }
    }
  },
  { timestamps: true }
);

patientSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('Patient', patientSchema);
