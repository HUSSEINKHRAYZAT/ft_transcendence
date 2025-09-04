import Fastify from 'fastify';
import { configPlugin } from './plugins/config';
import { smtpPlugin } from './plugins/smtp';
import { swaggerPlugin } from './plugins/swagger'; 
import routes from './routes/mailer.routes';

export async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(configPlugin);     
  await app.register(smtpPlugin);       
  await app.register(swaggerPlugin);    
  await app.register(routes);           
  app.get('/health', async () => ({ status: 'ok' }));
  return app;
}
