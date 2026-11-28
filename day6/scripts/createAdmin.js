require('dotenv').config();
const mongoose = require('mongoose');
const connectDatabase = require('../src/config/database');
const User = require('../src/models/User');

async function main() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD (at least 12 characters) in .env');
  }

  await connectDatabase();
  await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin'
  });
  console.log('Admin account created.');
}

main()
  .catch((error) => {
    console.error(error.code === 11000
      ? 'An account with that email already exists.'
      : 'Unable to create admin. Check the environment configuration and database availability.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

