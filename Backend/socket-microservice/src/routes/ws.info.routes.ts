import type { FastifyPluginAsync } from 'fastify';

const wsInfoRoutes: FastifyPluginAsync = async (app) => {
  app.get('/ws/info', {
    schema: {
      tags: ['ws'],
      summary: 'How to connect to the WebSocket',
      response: {
        200: {
          type: 'object',
          properties: {
            connectViaQuery: { type: 'string' },
            connectViaHeader: { type: 'string' },
            note: { type: 'string' },
            exampleWelcome: {
              type: 'object',
              properties: {
                t: { type: 'string' },
                userId: { type: ['number', 'null'] }
              }
            }
          }
        }
      }
    }
  }, async () => ({
    connectViaQuery: 'ws://<host>:3005/ws?token=<JWT>',
    connectViaHeader: 'Authorization: Bearer <JWT>',
    note: 'JWT is already validated by the API Gateway. This service does not verify it again.',
    exampleWelcome: { type: 'welcome', userId: 1 }
  }));
};

export default wsInfoRoutes;
