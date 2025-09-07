import Fastify from 'fastify';
import fp from 'fastify-plugin';

import { configPlugin } from './plugins/config';
import { dbPlugin } from './plugins/db';
import { swaggerPlugin } from './plugins/swagger';

import gamePlayersRoutes from './routes/game_players.routes';
import gamesRoutes from './routes/games.routes';
import tournamentsRoutes from './routes/tournaments.routes';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(configPlugin);

  await app.register(dbPlugin);

  await app.register(swaggerPlugin);

  await app.register(gamePlayersRoutes, { prefix: '/game_players' });
  await app.register(gamesRoutes, { prefix: '/games' });
  await app.register(tournamentsRoutes, { prefix: '/tournaments' });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}