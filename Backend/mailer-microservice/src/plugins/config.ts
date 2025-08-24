import fp from 'fastify-plugin';
import dotenv from 'dotenv';

export type AppConfig = {
  NODE_ENV: string;
  PORT: number;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER?: string | undefined;
  SMTP_PASS?: string | undefined;
  FROM_EMAIL: string;
  FROM_NAME: string;
};

export const configPlugin = fp(async (app) => {
  dotenv.config();
  const cfg: AppConfig = {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    PORT: Number(process.env.PORT ?? 3000),
    SMTP_HOST: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    SMTP_PORT: Number(process.env.SMTP_PORT),
    SMTP_SECURE: (process.env.SMTP_SECURE ?? 'false') === 'true',
    SMTP_USER: process.env.SMTP_USER || undefined,
    SMTP_PASS: process.env.SMTP_PASS || undefined,
    FROM_EMAIL: process.env.FROM_EMAIL ?? '42transcender@gmail.com',
    FROM_NAME: process.env.FROM_NAME ?? 'Transcender',
  };
  app.decorate('config', cfg);
});

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
  }
}
