import app from './app';

const start = async () => {
  try {
    await app.listen({ port: 4000, host: '0.0.0.0' });
    console.log('Realtime microservice running on ws://localhost:4000/game-ws');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
