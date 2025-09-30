import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { FastifyInstance } from "fastify";

export const registerSwagger = fp(async (fastify: FastifyInstance) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "Realtime Microservice",
        description: "Fastify REST + WebSocket API",
        version: "1.0.0",
      },
      tags: [
        { name: "health", description: "Health checks" },
        { name: "ws-events", description: "WebSocket messages (documented as JSON)" },
      ],
      components: {
        schemas: {
          HealthResponse: {
            type: "object",
            properties: {
              status: { type: "string" },
              message: { type: "string" },
              timestamp: { type: "string", format: "date-time" },
              rooms: { type: "number" },
              connectedPlayers: { type: "number" },
            },
          },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    staticCSP: true,
  });

  fastify.get(
    "/ws/events",
    {
      schema: {
        tags: ["ws-events"],
        summary: "List supported WebSocket messages",
      },
    },
    async () => ({
      clientToServer: [
        "register_player",
        "create_room",
        "join_room",
        "leave_room",
        "start_game",
        "game_state",
        "player_input",
        "chat_message",
      ],
      serverToClient: [
        "registered",
        "error",
        "room_created",
        "room_joined",
        "room_updated",
        "player_joined",
        "player_left",
        "game_ready",
        "game_started",
        "game_state",
        "game_exit",
        "chat_message",
        "server_shutdown",
      ],
      messageFormat: 'JSON { "type": "<event>", ...payload }',
    })
  );
});
