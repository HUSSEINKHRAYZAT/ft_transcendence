import fp from 'fastify-plugin';
import dotenv from 'dotenv';

export type AppConfig = {
  NODE_ENV: string;
  DB_FILE: string;
  PORT: number;
  MAILER_URL: string;
};

export const configPlugin = fp(async (app) => {
  dotenv.config();

  const cfg: AppConfig = {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    DB_FILE: process.env.DB_FILE ?? './data/user_management.db',
    PORT: Number(process.env.PORT ?? 3000),
    MAILER_URL: process.env.MAILER_URL ?? 'http://mailer:3000',
  };

  app.decorate('config', cfg);
});

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
  }
}