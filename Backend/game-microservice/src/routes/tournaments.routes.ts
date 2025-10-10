import type { FastifyPluginAsync } from 'fastify';
import tournamentsController from '../controllers/tournaments.controller';

const routes: FastifyPluginAsync = async (app) => {
  await app.register(tournamentsController);
};

export default routes;