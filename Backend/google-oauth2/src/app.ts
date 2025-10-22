import Fastify from 'fastify';
import https from 'https';
import { configPlugin } from './plugins/config';
import routes from './routes/auth.routes';

export async function buildApp(httpsOptions?: https.ServerOptions) {
  const app = Fastify({ 
    logger: true,
    ...(httpsOptions && { https: httpsOptions })
  });
  
  await app.register(configPlugin);
  await app.register(routes, { prefix: '/authWithGoogle' }); 
  
  app.get('/health', async () => ({ status: 'ok' }));
  
  return app;
}