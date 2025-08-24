import fp from 'fastify-plugin';
import { randomUUID } from 'crypto';

export const tracingPlugin = fp(async (app) => {
  app.addHook('onRequest', async (req, reply) => {
    const rid = (req.headers['x-request-id'] as string) || randomUUID();
    reply.header('x-request-id', rid);
    (req as any).requestId = rid;
  });
});

declare module 'fastify' {
  interface FastifyRequest {
    requestId?: string;
  }
}