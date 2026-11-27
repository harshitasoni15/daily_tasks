const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const { toSafeError } = require('../utils/safeErrors');

class ServiceError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function createPatient(patientData) {
  try {
    return await Patient.create(patientData);
  } catch (error) {
    throw toSafeError(error);
  }
}

async function createAppointment(patientId, appointmentData) {
  if (!mongoose.isObjectIdOrHexString(patientId)) {
    throw new ServiceError(400, 'INVALID_PATIENT_ID', 'Patient ID must be a valid ObjectId');
  }

  const patientExists = await Patient.exists({ _id: patientId });
  if (!patientExists) {
    throw new ServiceError(404, 'PATIENT_NOT_FOUND', 'Patient not found');
  }

  try {
    return await Appointment.create({ ...appointmentData, patientId });
  } catch (error) {
    throw toSafeError(error);
  }
}

async function getPatientAppointments(patientId) {
  if (!mongoose.isObjectIdOrHexString(patientId)) {
    throw new ServiceError(400, 'INVALID_PATIENT_ID', 'Patient ID must be a valid ObjectId');
  }

  return Appointment.find({ patientId })
    .sort({ appointmentDate: 1 })
    .populate('patientId', 'fullName');
}

module.exports = {
  ServiceError,
  createPatient,
  createAppointment,
  getPatientAppointments
};
