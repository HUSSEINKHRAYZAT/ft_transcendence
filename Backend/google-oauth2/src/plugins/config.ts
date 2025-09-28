import fp from 'fastify-plugin';
import dotenv from 'dotenv';

export type AppConfig = {
  NODE_ENV: string;
  PORT: number;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  USER_SERVICE_URL: string;
  AUTH_JWT_SECRET: string;
  AUTH_JWT_TTL: string;
  STATE_SECRET: string;
  ALLOWED_REDIRECTS: string;
};

export const configPlugin = fp(async (app) => {
  dotenv.config();
  const cfg: AppConfig = {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    PORT: Number(process.env.PORT ?? 3000),
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? '',
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:8080/authWithGoogle/callback',
    USER_SERVICE_URL: process.env.USER_SERVICE_URL ?? 'http://user_management:3000',
    AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET ?? 'dev-gateway-secret',
    AUTH_JWT_TTL: process.env.AUTH_JWT_TTL ?? '15m',
    STATE_SECRET: process.env.STATE_SECRET ?? 'dev-state-secret',
    ALLOWED_REDIRECTS: process.env.ALLOWED_REDIRECTS ?? 'http://localhost:5173',
  };
  app.decorate('config', cfg);
});

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
  }
}