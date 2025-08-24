import type { FastifyPluginAsync } from 'fastify';
import sessionsController from '../controllers/sessions.controller';

const routes: FastifyPluginAsync = async (app) => {
  await app.register(sessionsController);
};

export default routes;