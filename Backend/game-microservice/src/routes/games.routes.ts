import type { FastifyPluginAsync } from 'fastify';
import gamesController from '../controllers/games.controller';

const routes: FastifyPluginAsync = async (app) => {
  await app.register(gamesController);
};

export default routes;