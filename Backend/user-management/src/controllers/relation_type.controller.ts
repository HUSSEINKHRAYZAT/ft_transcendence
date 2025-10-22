import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { relationTypeService } from '../services/relation_type.service';
import { RelationType } from '../schemas/relation_type.schema';
import { ErrorResponse } from '../schemas/users.schema';

const plugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  const svc = relationTypeService(app);

  app.get(
    '/',
    {
      schema: {
        tags: ['user_relation_type'],
        querystring: Type.Object({
          limit: Type.Optional(Type.Number()),
          offset: Type.Optional(Type.Number()),
        }),
        response: { 200: Type.Array(RelationType) },
        summary: 'Get all relation types',
      },
    },
    async (req) => {
      const { limit = 100, offset = 0 } = req.query as { limit?: number; offset?: number };
      return svc.listTypes(limit, offset);
    }
  );

  // Lookup by type returns its numeric id
  app.post(
    '/',
    {
      schema: {
        tags: ['user_relation_type'],
        body: Type.Object({ type: Type.String() }, { additionalProperties: false }),
        response: {
          200: Type.Object({ id: Type.Number() }),
          404: ErrorResponse,
        },
        summary: 'Get relation type id by type string',
      },
    },
    async (req, reply) => {
      const { type } = req.body as { type: string };
      const id = svc.getTypeId(type);
      if (id == null) return reply.code(404).send({ error: 'type not found' });
      return { id };
    }
  );
};

export default plugin;
