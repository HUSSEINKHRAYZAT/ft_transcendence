import fp from 'fastify-plugin';
import dotenv from 'dotenv';

export type AppConfig = {
  NODE_ENV: string;
  PORT: number;
  USER_SERVICE_URL: string;
  SESSION_SERVICE_URL: string;
  MAILER_URL: string;
  CORS_ORIGIN: string;
  UPSTREAM_TIMEOUT_MS: number;
  AUTH_JWT_SECRET: string;
  AUTH_JWT_TTL: string;
};

export const configPlugin = fp(async (app) => {
  dotenv.config();

  const cfg: AppConfig = {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    PORT: Number(process.env.PORT ?? 8080),
    USER_SERVICE_URL: process.env.USER_SERVICE_URL ?? 'http://user_management:3000',
    MAILER_URL: process.env.MAILER_URL ?? 'http://mailer:3000',
    SESSION_SERVICE_URL: process.env.SESSION_SERVICE_URL ?? 'http://session_service:3000',
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*',
    UPSTREAM_TIMEOUT_MS: Number(process.env.UPSTREAM_TIMEOUT_MS ?? 15000),
    AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET ?? 'dev-gateway-secret',
    AUTH_JWT_TTL: process.env.AUTH_JWT_TTL ?? '15m',
  };

  app.decorate('config', cfg);
});

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
  }
}