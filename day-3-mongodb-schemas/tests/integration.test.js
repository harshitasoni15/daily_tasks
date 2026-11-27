const path = require('path');
process.env.MONGOMS_DOWNLOAD_DIR = path.join(__dirname, '..', '.cache', 'mongodb-binaries');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Patient = require('../src/models/Patient');
const Appointment = require('../src/models/Appointment');
const {
  ServiceError,
  createPatient,
  createAppointment,
  getPatientAppointments
} = require('../src/services/appointmentService');

let mongoServer;

const validPatient = () => ({
  fullName: 'Taylor Example',
  email: `taylor.${new mongoose.Types.ObjectId()}@example.test`,
  phoneNumber: '+1 555 010 2041',
  dateOfBirth: '1990-04-12'
});
const validAppointment = (patientId, overrides = {}) => ({
  doctorName: 'Dr. Jordan Example',
  appointmentDate: new Date('2035-06-15T10:00:00.000Z'),
  reason: 'Routine consultation',
  patientId,
  ...overrides
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Promise.all([Patient.init(), Appointment.init()]);
});

beforeEach(async () => {
  await Promise.all([Patient.deleteMany({}), Appointment.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Patient and Appointment database integration', () => {
  test('creates a patient and appointment with timestamps and populated patient reference', async () => {
    const patient = await createPatient(validPatient());
    const appointment = await createAppointment(patient._id, validAppointment(patient._id));
    const results = await getPatientAppointments(patient._id);

    expect(patient._id).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(patient.createdAt).toBeInstanceOf(Date);
    expect(patient.updatedAt).toBeInstanceOf(Date);
    expect(appointment.patientId.toString()).toBe(patient._id.toString());
    expect(appointment.status).toBe('pending');
    expect(results).toHaveLength(1);
    expect(results[0].patientId.fullName).toBe(patient.fullName);
  });

  test('rejects missing required patient fields', async () => {
    await expect(new Patient({}).validate()).rejects.toMatchObject({ name: 'ValidationError' });
  });

  test('rejects an invalid patient email', async () => {
    const patient = new Patient({ ...validPatient(), email: 'not-an-email' });
    await expect(patient.validate()).rejects.toMatchObject({ name: 'ValidationError' });
  });

  test('prevents duplicate patient email without returning the submitted address', async () => {
    const patient = validPatient();
    await createPatient(patient);

    await expect(createPatient(patient)).rejects.toMatchObject({
      code: 'DUPLICATE_PATIENT_EMAIL',
      message: 'A patient with this email already exists',
      status: 409
    });
  });

  test('rejects appointments missing required fields, with invalid status, or invalid date', async () => {
    await expect(new Appointment({}).validate()).rejects.toMatchObject({ name: 'ValidationError' });

    const patient = await createPatient(validPatient());
    await expect(
      new Appointment(validAppointment(patient._id, { status: 'scheduled' })).validate()
    ).rejects.toMatchObject({ name: 'ValidationError' });
    await expect(
      new Appointment(validAppointment(patient._id, { appointmentDate: 'not-a-date' })).validate()
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });

  test('rejects appointments whose patient reference does not exist', async () => {
    const missingPatientId = new mongoose.Types.ObjectId();
    await expect(
      new Appointment(validAppointment(missingPatientId)).validate()
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });

  test('returns a safe error for invalid patient ObjectIds', async () => {
    await expect(createAppointment('not-an-object-id', validAppointment(null))).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_PATIENT_ID',
      message: 'Patient ID must be a valid ObjectId'
    });
    await expect(getPatientAppointments('not-an-object-id')).rejects.toBeInstanceOf(ServiceError);
  });

  test('defines exactly the requested unique email and compound appointment indexes', async () => {
    expect(Patient.schema.indexes()).toEqual([
      [{ email: 1 }, { unique: true, background: true }]
    ]);
    expect(Appointment.schema.indexes()).toEqual([
      [{ patientId: 1, appointmentDate: 1 }, { background: true }]
    ]);
    const indexes = await Appointment.collection.indexes();
    expect(indexes.some((index) => index.name === 'patientId_1_appointmentDate_1')).toBe(true);
  });

  test('uses the patient/date compound index for sorted appointment lookups', async () => {
    const patient = await createPatient(validPatient());
    const later = new Date('2035-06-16T10:00:00.000Z');
    const earlier = new Date('2035-06-15T10:00:00.000Z');
    await Appointment.create([
      validAppointment(patient._id, { appointmentDate: later }),
      validAppointment(patient._id, { appointmentDate: earlier })
    ]);

    const plan = await Appointment.find({ patientId: patient._id })
      .sort({ appointmentDate: 1 })
      .hint('patientId_1_appointmentDate_1')
      .explain('executionStats');
    const appointments = await getPatientAppointments(patient._id);

    expect(JSON.stringify(plan)).toContain('patientId_1_appointmentDate_1');
    expect(appointments.map((item) => item.appointmentDate.toISOString())).toEqual([
      earlier.toISOString(),
      later.toISOString()
    ]);
  });
});
