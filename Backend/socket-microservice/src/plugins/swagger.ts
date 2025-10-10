import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { Type } from '@sinclair/typebox';

export const swaggerPlugin = fp(async (app) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Socket Microservice',
        description:
          'WebSocket gateway (JWT already validated by API Gateway). Exposes `/ws` for upgrades and `/health`. \n\n' +
          'Connect using: `ws://localhost:3005/ws?token=JWT`',
        version: '1.0.0',
      },
      servers: [
        { url: 'http://localhost:3005', description: 'Local (host)' },
        { url: '/', description: 'Intra-docker' },
      ],
      tags: [
        { name: 'ws', description: 'WebSocket endpoint' },
        { name: 'system', description: 'Health & service info' },
      ],
    },
  });

  await app.register(swaggerUI, {
    routePrefix: '/docs',
    staticCSP: true,
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });

  // --- Add WebSocket message schemas ---
  app.addSchema({
    $id: 'DirectMessageRequest',
    type: 'object',
    properties: {
      t: { type: 'string', enum: ['direct-message'] },
      to: { type: 'number' },
      text: { type: 'string' },
    },
    required: ['t', 'to', 'text'],
  });

  app.addSchema({
    $id: 'DirectMessageResponse',
    type: 'object',
    properties: {
      t: { type: 'string', enum: ['direct-message'] },
      from: { type: 'number' },
      text: { type: 'string' },
    },
    required: ['t', 'from', 'text'],
  });

  app.addSchema({
    $id: 'PresenceNotification',
    type: 'object',
    properties: {
      t: { type: 'string', enum: ['friend-online', 'friend-offline'] },
      userId: { type: 'number' },
    },
    required: ['t', 'userId'],
  });

  // --- Add docs-only route to describe WS usage ---
  app.get(
    '/docs/ws',
    {
      schema: {
        tags: ['ws'],
        summary: 'WebSocket usage',
        description: `
### Connect
\`ws://localhost:3005/ws?token=JWT\`

### Messages you can send
- **Ping:** \`{ "t": "ping" }\`
- **Direct message:** \`DirectMessageRequest\`

### Messages you may receive
- **Welcome:** \`{ "t": "welcome", "userId": <yourId> }\`
- **Direct message:** \`DirectMessageResponse\`
- **Presence events:** \`PresenceNotification\`
        `,
        response: {
          200: Type.Object({
            message: Type.String({ default: 'See Swagger docs for WebSocket usage' }),
          }),
        },
      },
    },
    async () => ({ message: 'See Swagger docs for WebSocket usage' })
  );

  // Expose the JSON too
  app.get('/openapi.json', async () => app.swagger());
});

export default swaggerPlugin;
