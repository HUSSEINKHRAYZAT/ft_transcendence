import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { sessionsService } from '../services/sessions.service';
import { CreateSessionBody, CreateSessionReply, Session, CreateSessionBodyType, ErrorResponse } from '../schemas/session.schema';

const plugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  const svc = sessionsService(app);

  app.post(
    '/',
    {
      schema: {
        tags: ['sessions'],                                
        body: CreateSessionBody,                           
        response: { 201: CreateSessionReply, 409: ErrorResponse, 500: ErrorResponse },
        summary: 'Create session',
      },
    },
    async (req, reply) => {
      const body = req.body as CreateSessionBodyType;
      try {
        const newId = svc.createSession(body);
        const created = svc.getSessionById(newId);
        return reply.status(201).send(created);         
      } catch (e: any) {
        if (String(e.message).includes('UNIQUE')) {     
          return reply.status(409).send({ error: 'code or socketId already exists' });
        }
        return reply.status(500).send({ error: e });                                      
      }
    }
  );

  app.get(
    '/:code',
    {
      schema: {
        tags: ['sessions'],
        params: Type.Object({ code: Type.Number() }),
        response: { 200: Type.Object({ socketId: Type.Number() }), 404: ErrorResponse },
        summary: 'Get a socketId by code',
      },
    },
    async (req, reply) => {
      const { code } = req.params as any;
      const socketId = svc.getSocketIdByCode(Number(code));
      if (!socketId) return reply.status(404).send({ error: 'session not found' });
      return {
        socketId
      };
    }
  );

  app.delete(
    '/:code',
    {
      schema: {
        tags: ['sessions'],
        params: Type.Object({ code: Type.Number() }),
        response: { 204: Type.Null(), 404: ErrorResponse },
        summary: 'Delete a session',
      },
    },
    async (req, reply) => {
      const { code } = req.params as any;
      const removed = svc.deleteSession(Number(code));
      if (!removed) return reply.status(404).send({ error: 'session not found' });
      return reply.status(204).send();
    }
  );
};

export default plugin;