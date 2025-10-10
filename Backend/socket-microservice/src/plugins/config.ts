import fp from 'fastify-plugin';
import dotenv from 'dotenv';

export type AppConfig = {
  PORT: number;
  USER_SERVICE_URL: string;     // http://user_management:3000
  AUTH_JWT_SECRET: string;      // must match your gateway JWT secret
  HEARTBEAT_MS: number;         // ping interval
};

export const configPlugin = fp(async (app) => {
  dotenv.config();
  app.decorate('config', {
    PORT: Number(process.env.PORT ?? 3005),
    USER_SERVICE_URL: process.env.USER_SERVICE_URL ?? 'http://user_management:3000',
    AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET ?? 'dev-gateway-secret',
    HEARTBEAT_MS: Number(process.env.HEARTBEAT_MS ?? 15000),
  } as AppConfig);
});

declare module 'fastify' {
  interface FastifyInstance { config: AppConfig }
}
