import { FastifyInstance } from "fastify";

export const healthRoutes = async (fastify: FastifyInstance) => {
  fastify.get(
    "/api/health",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              service: { type: "string" },
              timestamp: { type: "string" },
            },
          },
        },
      },
    },
    async () => {
      return {
        status: "OK",
        service: "realtime_microservice",
        timestamp: new Date().toISOString(),
      };
    }
  );
};
