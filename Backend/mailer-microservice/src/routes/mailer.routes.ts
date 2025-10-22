import type { FastifyPluginAsync } from 'fastify';
import sendController from '../controllers/send.controller';

const routes: FastifyPluginAsync = async (app) => {
  await app.register(sendController);
};

export default routes;
