import type { FastifyPluginAsync } from 'fastify';
import gamePlayersController from '../controllers/game_players.controller';

const routes: FastifyPluginAsync = async (app) => {
  await app.register(gamePlayersController);
};

export default routes;