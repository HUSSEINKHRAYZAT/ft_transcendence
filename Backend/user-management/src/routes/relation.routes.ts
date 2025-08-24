import type { FastifyPluginAsync } from 'fastify';
import relationController from '../controllers/relation.controller';

const routes: FastifyPluginAsync = async (app) => {
  await app.register(relationController);
};

export default routes;