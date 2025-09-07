import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { mailerService } from '../services/mailer.service';

const plugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  const svc = mailerService(app);

  app.post(
    '/send/verification',
    {
      schema: {
        tags: ['send'],
        summary: 'Send verification code email',
        body: Type.Object({
          to: Type.String({ format: 'email' }),
          firstName: Type.String(),
          code: Type.String(),
        }),
        response: { 202: Type.Object({ queued: Type.Boolean() }) },
      },
    },
    async (req, reply) => {
      const { to, firstName, code } = req.body as any;
      await svc.sendVerification(to, firstName, code);
      return reply.status(202).send({ queued: true });
    }
  );
};

export default plugin;
