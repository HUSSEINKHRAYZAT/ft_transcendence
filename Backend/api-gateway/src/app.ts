import Fastify from 'fastify';
import { configPlugin } from './plugins/config';
import { corsPlugin } from './plugins/cors';
import { rateLimitPlugin } from './plugins/rate-limit';
import { tracingPlugin } from './plugins/tracing';
import { jwtPlugin } from './plugins/jwt';
import proxyRoutes from './routes/proxy.route';
import authRoutes from './routes/auth.route';

export async function buildApp() {
  const app = Fastify({ logger: true, trustProxy: true });

  await app.register(configPlugin);
  await app.register(corsPlugin);
  await app.register(rateLimitPlugin);
  await app.register(tracingPlugin);
  await app.register(jwtPlugin);

  await app.register(authRoutes); 
  await app.register(proxyRoutes);

  app.get('/health', async () => ({ status: 'ok' }));
  return app;
}
