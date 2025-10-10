import type { FastifyPluginAsync } from 'fastify';
import statisticsController from '../controllers/statistics.controller';

const routes: FastifyPluginAsync = async (app) => {
  await app.register(statisticsController);
};

export default routes;