const mongoose = require('mongoose');
const Patient = require('../src/models/Patient');
const Appointment = require('../src/models/Appointment');
const { ServiceError, createAppointment } = require('../src/services/appointmentService');
const { toSafeError } = require('../src/utils/safeErrors');

describe('Mongoose schema validation and indexes (no database required)', () => {
  test('requires patient name, email, and phone number', () => {
    const error = new Patient({}).validateSync();

    expect(error.name).toBe('ValidationError');
    expect(Object.keys(error.errors)).toEqual(expect.arrayContaining(['fullName', 'email', 'phoneNumber']));
  });
  test('rejects invalid patient email and normalizes valid email', () => {
    const invalidPatient = new Patient({
      fullName: 'Taylor Example',
      email: 'not-an-email',
      phoneNumber: '+1 555 010 2041'
    });
    expect(invalidPatient.validateSync().errors.email).toBeDefined();

    const validPatient = new Patient({
      fullName: 'Taylor Example',
      email: ' TAYLOR@example.test ',
      phoneNumber: '+1 555 010 2041'
    });
    expect(validPatient.email).toBe('taylor@example.test');
  });

  test('validates required appointment fields, status, date, and ObjectId type', () => {
    const missing = new Appointment({}).validateSync();
    expect(missing.name).toBe('ValidationError');
    expect(Object.keys(missing.errors)).toEqual(expect.arrayContaining([
      'patientId',
      'doctorName',
      'appointmentDate',
      'reason'
    ]));

    const invalid = new Appointment({
      patientId: new mongoose.Types.ObjectId(),
      doctorName: 'Dr. Example',
      appointmentDate: 'invalid-date',
      reason: 'Routine checkup',
      status: 'scheduled'
    }).validateSync();
    expect(invalid.errors.appointmentDate).toBeDefined();
    expect(invalid.errors.status).toBeDefined();
  });

  test('declares exactly the requested indexes', () => {
    expect(Patient.schema.indexes()).toEqual([
      [{ email: 1 }, { unique: true, background: true }]
    ]);
    expect(Appointment.schema.indexes()).toEqual([
      [{ patientId: 1, appointmentDate: 1 }, { background: true }]
    ]);
  });

  test('rejects malformed IDs before any database operation', async () => {
    await expect(createAppointment('invalid-id', {})).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_PATIENT_ID'
    });
    await expect(createAppointment('invalid-id', {})).rejects.toBeInstanceOf(ServiceError);
  });

  test('maps duplicate email errors to a message without patient data', () => {
    const safeError = toSafeError({ code: 11000, keyValue: { email: 'private@example.test' } });

    expect(safeError.code).toBe('DUPLICATE_PATIENT_EMAIL');
    expect(safeError.message).toBe('A patient with this email already exists');
    expect(safeError.message).not.toContain('private@example.test');
  });
});
