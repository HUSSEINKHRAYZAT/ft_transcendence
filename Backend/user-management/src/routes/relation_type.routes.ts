import type { FastifyPluginAsync } from 'fastify';
import relationTypeController from '../controllers/relation_type.controller';

const routes: FastifyPluginAsync = async (app) => {
  await app.register(relationTypeController);
};

export default routes;