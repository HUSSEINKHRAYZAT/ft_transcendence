import Fastify from 'fastify';
import { configPlugin } from './plugins/config';
import routes from './routes/auth.routes';

export async function buildApp() {
  const app = Fastify({ logger: true });
  
  await app.register(configPlugin);
  await app.register(routes, { prefix: '/authWithGoogle' }); 
  
  app.get('/health', async () => ({ status: 'ok' }));
  
  return app;
}