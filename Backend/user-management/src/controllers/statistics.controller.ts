import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { statisticsService } from '../services/statistics.service';
import { Stats, UpdateStatsBody } from '../schemas/statistics.schema';
import { ErrorResponse } from '../schemas/users.schema';

const plugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  const svc = statisticsService(app);

  app.get(
	'/',
    {
      schema: {
      tags: ['statistics'],
      querystring: Type.Object({
        limit: Type.Optional(Type.Number()),
        offset: Type.Optional(Type.Number()),
      }),
      response: { 200: Type.Array(Stats)},
      summary: 'Get statistics for a user',
      },
    },
    async (req) => {
      const { limit = 50, offset = 0 } = (req.query as any) ?? {};
      return svc.listStats(limit, offset);
    }
  );

  app.get(
    '/:userId',
    {
      schema: {
        tags: ['statistics'],
        params: Type.Object({ userId: Type.Number() }),
        response: { 200: Stats, 404: ErrorResponse },
        summary: 'Get statistics for a user',
      },
    },
    async (req, reply) => {
      const { userId } = req.params as any;
      const row = svc.getByUserId(Number(userId));
      if (!row) return reply.status(404).send({ error: 'not found' });
      return row;
    }
  );

  app.patch(
    '/:userId',
    {
      schema: {
        tags: ['statistics'],
        params: Type.Object({ userId: Type.Number() }),
        body: UpdateStatsBody,
        response: { 200: Stats, 404: ErrorResponse },
        summary: 'Increment/decrement statistics counters for a user',
      },
    },
    async (req, reply) => {
      const { userId } = req.params as any;
      const changed = svc.patchByUserId(Number(userId), req.body as any);
      if (!changed) return reply.status(404).send({ error: 'not found or no change' });
      return svc.getByUserId(Number(userId));
    }
  );
};

export default plugin;