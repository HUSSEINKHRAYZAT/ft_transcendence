import { buildApp } from './app';
const PORT = Number(process.env.PORT ?? 3000);
(async () => {
  const app = await buildApp();
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`mailer-microservice listening on ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
})();
