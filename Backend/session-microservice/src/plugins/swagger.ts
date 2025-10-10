import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

export const swaggerPlugin = fp(async (app) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'session API',
        description: 'Fastify + TypeScript + SQLite microservice for sessions',
        version: '1.0.0',
      },
      servers: [
        { url: '/', description: 'container-internal (compose network)' },
      ],
      tags: [
        { name: 'sessions', description: 'Session CRUD' }
      ],
    },
  });

  await app.register(swaggerUI, {
    routePrefix: '/docs',
    staticCSP: true,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  app.get('/openapi.json', async () => app.swagger());
});