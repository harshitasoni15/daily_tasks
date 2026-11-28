const mongoose = require('mongoose');
const { hashPassword } = require('../utils/password');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [120, 'Name must not exceed 120 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, 'Email must not exceed 254 characters'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email must be valid']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [12, 'Password must be at least 12 characters'],
      validate: {
        validator: (value) => typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72,
        message: "Password must not exceed bcrypt's 72-byte limit"
      },
      select: false
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      required: true,
      default: 'student'
    }
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashModifiedPassword() {
  if (this.isModified('password')) {
    this.password = await hashPassword(this.password);
  }
});

userSchema.set('toJSON', {
  transform: (doc, value) => {
    delete value.password;
    delete value.__v;
    return value;
  }
});

module.exports = mongoose.model('User', userSchema);

