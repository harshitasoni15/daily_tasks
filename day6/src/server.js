require('dotenv').config();
const app = require('./app');
const connectDatabase = require('./config/database');
const { getJwtSecret } = require('./utils/token');

const port = Number(process.env.PORT) || 3000;

async function start() {
  getJwtSecret();
  await connectDatabase();
  app.listen(port, () => {
    console.log(`Online exam API listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error(`Unable to start online exam API: ${error.name || 'Error'}`);
  process.exitCode = 1;
});

