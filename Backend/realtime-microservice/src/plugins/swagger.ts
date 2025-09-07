import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

export default fp(async (app) => {
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Realtime Microservice API',
        description: 'Handles WebSocket game sync',
        version: '1.0.0',
      },
      servers: [
        { url: 'http://localhost:4000', description: 'Realtime REST API' },
        { url: 'ws://localhost:4000', description: 'Realtime WebSocket API' },
      ],
      paths: {
        "/game-ws": {
          get: {
            summary: "Connect to Pong Game WebSocket",
            description: "Upgrade this request to a WebSocket connection. Query parameters: token (JWT), gameId (string).",
            parameters: [
              {
                name: "token",
                in: "query",
                required: true,
                schema: { type: "string" },
                description: "JWT for authentication"
              },
              {
                name: "gameId",
                in: "query",
                required: true,
                schema: { type: "string" },
                description: "Game session ID"
              }
            ],
            responses: {
              "101": {
                description: "Switching Protocols – WebSocket upgrade successful"
              },
              "400": {
                description: "Invalid request"
              },
              "401": {
                description: "Unauthorized"
              }
            }
          }
        }
      }
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
  });
});
