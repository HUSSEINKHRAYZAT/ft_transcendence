import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

export const swaggerPlugin = fp(async (app) => {
  await app.register(swagger, {
    openapi: {
      info: { title: 'mailer-microservice', version: '1.0.0' },
      tags: [{ name: 'send', description: 'Mail sending endpoints' }],
    },
  });
  await app.register(swaggerUI, { routePrefix: '/docs', staticCSP: true });
  app.get('/openapi.json', async () => app.swagger());
});
