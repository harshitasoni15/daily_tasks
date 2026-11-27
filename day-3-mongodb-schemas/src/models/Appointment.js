const mongoose = require('mongoose');
const Patient = require('./Patient');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient reference is required'],
      validate: {
        validator: (value) => mongoose.isObjectIdOrHexString(value),
        message: 'Patient reference must be a valid ObjectId'
      }
    },
    doctorName: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
      minlength: [2, 'Doctor name must be at least 2 characters'],
      maxlength: [120, 'Doctor name must not exceed 120 characters']
    },
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
      validate: {
        validator: (value) => value instanceof Date && !Number.isNaN(value.getTime()),
        message: 'Appointment date must be a valid date'
      }
    },
    reason: {
      type: String,
      required: [true, 'Appointment reason is required'],
      trim: true,
      minlength: [2, 'Appointment reason must be at least 2 characters'],
      maxlength: [500, 'Appointment reason must not exceed 500 characters']
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'cancelled', 'completed'],
        message: 'Appointment status must be pending, confirmed, cancelled, or completed'
      },
      default: 'pending'
    }
  },
  { timestamps: true }
);

appointmentSchema.pre('validate', async function validatePatientReference() {
  if (!this.patientId || this.errors?.patientId) {
    return;
  }

  const patientExists = await Patient.exists({ _id: this.patientId });
  if (!patientExists) {
    this.invalidate('patientId', 'Referenced patient does not exist');
  }
});

appointmentSchema.index({ patientId: 1, appointmentDate: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
