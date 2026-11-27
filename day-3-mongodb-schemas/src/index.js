module.exports = {
  Patient: require('./models/Patient'),
  Appointment: require('./models/Appointment'),
  appointmentService: require('./services/appointmentService'),
  connectDatabase: require('./config/database')
};
