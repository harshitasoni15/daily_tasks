require('dotenv').config();
const mongoose = require('mongoose');
const connectDatabase = require('../config/database');
const {
  createPatient,
  createAppointment,
  getPatientAppointments
} = require('../services/appointmentService');

async function main() {
  await connectDatabase();

  const patient = await createPatient({
    fullName: 'Alex Example',
    email: `alex.example.${Date.now()}@example.test`,
    phoneNumber: '+1 555 010 2040',
    dateOfBirth: '1995-05-10'
  });

  await createAppointment(patient._id, {
    doctorName: 'Dr. Morgan Lee',
    appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    reason: 'Annual check-up'
  });

  const appointments = await getPatientAppointments(patient._id);
  console.log(`Created one patient and ${appointments.length} appointment(s).`);
  console.log(appointments.map((appointment) => ({
    doctorName: appointment.doctorName,
    appointmentDate: appointment.appointmentDate,
    status: appointment.status,
    patientName: appointment.patientId.fullName
  })));
}

main()
  .catch(() => {
    console.error('Unable to create sample data. Check MONGODB_URI, database availability, and input validation.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
