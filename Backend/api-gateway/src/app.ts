import Fastify from 'fastify';
import { configPlugin } from './plugins/config';
import { corsPlugin } from './plugins/cors';
import { rateLimitPlugin } from './plugins/rate-limit';
import { tracingPlugin } from './plugins/tracing';
import { jwtPlugin } from './plugins/jwt';
import proxyRoutes from './routes/proxy.route';
import authRoutes from './routes/auth.route';
import { swaggerPlugin } from './plugins/swagger';
import httpProxy from '@fastify/http-proxy';

export async function buildApp() {
  const app = Fastify({ logger: true, trustProxy: true });

  await app.register(configPlugin);
  await app.register(corsPlugin);
  await app.register(rateLimitPlugin);
  await app.register(tracingPlugin);
  await app.register(jwtPlugin);
  await app.register(swaggerPlugin);

  await app.register(authRoutes); 
  await app.register(proxyRoutes);

  await app.register(httpProxy, {
    upstream: app.config.SOCKET_URL ?? 'http://socket_service:3005',
    prefix: '/socket',
    websocket: true
  });

  app.get('/health', async () => ({ status: 'ok' }));
  return app;
}
