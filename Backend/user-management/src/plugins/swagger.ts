import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

export const swaggerPlugin = fp(async (app) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'user-management API',
        description: 'Fastify + TypeScript + SQLite microservice for users & stats',
        version: '1.0.0',
      },
      servers: [
        { url: '/', description: 'container-internal (compose network)' },
      ],
      tags: [
        { name: 'users', description: 'User CRUD & auth' },
        { name: 'statistics', description: 'Game statistics' },
        { name: 'user_relation', description: 'user relations apis' },
        { name: 'user_relation_type', description: 'user relations types apis' },
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