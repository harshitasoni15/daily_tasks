const app = require('./app');

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.info(`Quiz attempt API listening on port ${port}`);
});

