import { buildApp } from './app';
import { getHttpsConfig } from './utils/https-config';

const PORT = Number(process.env.PORT ?? 3000);
(async () => {
  const httpsConfig = getHttpsConfig();
  const app = await buildApp(httpsConfig.options);
  
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    const protocol = httpsConfig.enabled ? 'HTTPS' : 'HTTP';
    app.log.info(`✅ mailer-microservice listening on ${PORT} (${protocol})`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
})();
