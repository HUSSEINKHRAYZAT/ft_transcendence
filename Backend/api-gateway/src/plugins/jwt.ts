import fp from 'fastify-plugin';
import fjwt from '@fastify/jwt';

export const jwtPlugin = fp(async (app) => {
  await app.register(fjwt, {
    secret: app.config.AUTH_JWT_SECRET,
    sign: { expiresIn: app.config.AUTH_JWT_TTL },
  });

  app.decorate('authenticate', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ error: 'unauthorized' });
    }
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: any, reply: any) => Promise<void>;
  }
  interface FastifyJwt {
    user: { sub: number; username: string; email: string };
  }
}