import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { relationService } from '../services/relation.service';
import { relationTypeService } from '../services/relation_type.service';
import {
  CreateRelationBody,
  CreateRelationBodyWithUsername,
  CreateRelationReply,
  UpdateRelationBody,
  type CreateRelationBodyTS,
  type CreateRelationBodyWithUsernameTS,
  type UpdateRelationBodyTS,
  Friend,
  UpdateRelationBodyWithUsername,
  type UpdateRelationBodyWithUsernameTS,
  deleteRelationBody,
  type deleteRelationBodyTS,
  FriendRequest
} from '../schemas/relation.schema';
import { ErrorResponse } from '../schemas/users.schema';
import { Type } from '@sinclair/typebox';
import { usersService } from '../services/users.service';

const plugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  const svc = relationService(app);
  const rts = relationTypeService(app);
  const userSvc = usersService(app);

  app.post(
    '/',
    {
      schema: {
        tags: ['user_relation'],
        body: CreateRelationBodyWithUsername,
        response: { 201: CreateRelationReply, 404: ErrorResponse, 409: ErrorResponse },
        summary: 'Create relation',
      },
    },
    async (req, reply) => {
      const body = req.body as CreateRelationBodyWithUsernameTS;

      const userOne = await userSvc.getUserByUsername(body.usernameOne);
      if (!userOne) return reply.status(404).send({ error: `user ${body.usernameOne} not found` });
      const userTwo = await userSvc.getUserByUsername(body.usernameTwo);
      if (!userTwo) return reply.status(404).send({ error: `user ${body.usernameTwo} not found` });

      const typeId = rts.getTypeId(body.type);
      if (typeId == null) return reply.status(404).send({ error: 'relation type not found' });

      const newId = svc.createRelation({ userOneId: userOne.id, userTwoId: userTwo.id, typeId });
      if (newId == null) {
        return reply.status(409).send({ error: 'relation already exists between these users' });
      }

      const created = svc.getRelation(userOne.id, userTwo.id);
      return reply.status(201).send(created);
    }
  );

  app.patch(
    '/',
    {
      schema: {
        tags: ['user_relation'],
        body: UpdateRelationBodyWithUsername,
        response: { 200: CreateRelationReply, 404: ErrorResponse },
        summary: 'Update relation',
      },
    },
    async (req, reply) => {
      const body = req.body as UpdateRelationBodyWithUsernameTS;

      const userOne = await userSvc.getUserByUsername(body.usernameOne);
      if (!userOne) return reply.status(404).send({ error: `user ${body.usernameOne} not found` });
      const userTwo = await userSvc.getUserByUsername(body.usernameTwo);
      if (!userTwo) return reply.status(404).send({ error: `user ${body.usernameTwo} not found` });

      const data = {
        type: body.type,
        userOneId: userOne.id,
        userTwoId: userTwo.id
      } as UpdateRelationBodyTS;

      const changed = svc.patchRelation(data);
      if (!changed) return reply.status(404).send({ error: 'not found or no change' });

      const updated = svc.getRelation(userOne.id, userTwo.id);
      return reply.status(200).send(updated);
    }
  );

  app.get(
    '/friends/:userId',
    {
      schema: {
        tags: ['user_relation'],
        params: Type.Object({ userId: Type.Number() }),
        response: { 200: Type.Array(Friend) },
        summary: 'List friends for a user',
      },
    },
    async (req) => {
      const { userId } = req.params as { userId: number };
      return svc.listFriends(userId);
    }
  );

  app.get(
    '/blocked/:userId',
    {
      schema: {
        tags: ['user_relation'],
        params: Type.Object({ userId: Type.Number() }),
        response: { 200: Type.Array(Friend) },
        summary: 'List friends for a user',
      },
    },
    async (req) => {
      const { userId } = req.params as { userId: number };
      return svc.listBlocked(userId);
    }
  );

  app.get(
    '/requests/:userId',
    {
      schema: {
        tags: ['user_relation'],
        params: Type.Object({ userId: Type.Number() }),
        response: { 200: Type.Array(FriendRequest) },
        summary: 'List requests for a user',
      },
    },
    async (req) => {
      const { userId } = req.params as { userId: number };
      return svc.listRequests(userId);
    }
  );

  app.delete(
    '/',
    {
      schema: {
        tags: ['user_relation'],
        body: deleteRelationBody,
        response: { 200: Type.Object({ deleted: Type.Number() }), 404: ErrorResponse },
        summary: 'Delete relation',
      },
    },
    async (req, reply) => {
      const body = req.body as deleteRelationBodyTS;

      const userOne = await userSvc.getUserByUsername(body.usernameOne);
      if (!userOne) return reply.status(404).send({ error: `user ${body.usernameOne} not found` });
      const userTwo = await userSvc.getUserByUsername(body.usernameTwo);
      if (!userTwo) return reply.status(404).send({ error: `user ${body.usernameTwo} not found` });

      const deleted = svc.deleteRelation(userOne.id, userTwo.id);
      if (!deleted) return reply.status(404).send({ error: 'relation not found' });
      return reply.status(200).send({ deleted });
    }
  );

  

};

export default plugin;
