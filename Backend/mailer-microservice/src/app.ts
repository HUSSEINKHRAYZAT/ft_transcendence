import Fastify from 'fastify';
import https from 'https';
import { configPlugin } from './plugins/config';
import { smtpPlugin } from './plugins/smtp';
import { swaggerPlugin } from './plugins/swagger'; 
import routes from './routes/mailer.routes';

export async function buildApp(httpsOptions?: https.ServerOptions) {
  const app = Fastify({ 
    logger: true,
    ...(httpsOptions && { https: httpsOptions })
  });
  await app.register(configPlugin);     
  await app.register(smtpPlugin);       
  await app.register(swaggerPlugin);    
  await app.register(routes);           
  app.get('/health', async () => ({ status: 'ok' }));
  return app;
}
