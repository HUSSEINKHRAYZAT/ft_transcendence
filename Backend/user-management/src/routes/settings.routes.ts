import type { FastifyPluginAsync } from 'fastify';
import settingsController from '../controllers/settings.controller';

const routes: FastifyPluginAsync = async (app) => {
  await app.register(settingsController);
};

export default routes;
