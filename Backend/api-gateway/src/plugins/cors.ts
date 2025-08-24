import fp from 'fastify-plugin';
import cors from '@fastify/cors';

export const corsPlugin = fp(async (app) => {
  await app.register(cors, {
    origin: app.config.CORS_ORIGIN === '*' ? true : app.config.CORS_ORIGIN,
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  });
});