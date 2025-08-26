import app from './app.js';
import { startOtel } from './otel.js';

const port = process.env.PORT || 3000;

async function start() {
  await startOtel();
  app.listen(port, () => {
    console.log(`listening on ${port}`);
  });
}

start();
