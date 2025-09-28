import type { FastifyPluginAsync } from 'fastify';
import usersController from '../controllers/users.controller';

const routes: FastifyPluginAsync = async (app) => {
  await app.register(usersController);
};

export default routes;