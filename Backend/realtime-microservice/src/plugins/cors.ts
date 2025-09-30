import fp from "fastify-plugin";
import cors from "@fastify/cors";
import { FastifyInstance } from "fastify";
import { config } from "../config";

export const registerCors = fp(async (fastify: FastifyInstance) => {
  await fastify.register(cors, {
    origin: config.CORS_ORIGIN === "*" ? true : config.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
  });
});
