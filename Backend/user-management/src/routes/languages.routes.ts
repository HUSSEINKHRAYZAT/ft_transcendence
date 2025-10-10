import type { FastifyPluginAsync } from 'fastify';
import languagesController from '../controllers/languages.controller';

const routes: FastifyPluginAsync = async (app) => {
  await app.register(languagesController);
};

export default routes;
