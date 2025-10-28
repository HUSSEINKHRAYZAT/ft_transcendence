import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const routes: FastifyPluginAsync = async (app) => {
  app.post('/auth/login', {
    schema: {
      tags: ['auth'],
      body: Type.Object({
        username: Type.String(),
        password: Type.String(),
      }),
      response: {
        200: Type.Object({
          token: Type.String(),
          user: Type.Object({
            id: Type.Number(),
            username: Type.String(),
            email: Type.String({ format: 'email' }),
            firstName: Type.String(),
            lastName: Type.String(),
            isVerified: Type.Number(),
            twoFactorEnabled: Type.Number(),
            status: Type.String(),
            createdAt: Type.String(),
            updatedAt: Type.String(),
            profilePath: Type.Optional(Type.String()),
          }),
        }),
        202: Type.Object({
          token: Type.String(),
          user: Type.Object({
            id: Type.Number(),
            username: Type.String(),
            email: Type.String({ format: 'email' }),
            firstName: Type.String(),
            lastName: Type.String(),
            isVerified: Type.Number(),
            twoFactorEnabled: Type.Number(),
            status: Type.String(),
            createdAt: Type.String(),
            updatedAt: Type.String(),
            profilePath: Type.Optional(Type.String()),
          }),
        }),
        401: Type.Object({ error: Type.String() }),
        403: Type.Object({ error: Type.String() }),
        500: Type.Object({ error: Type.String() }),
        303: Type.Object({ error: Type.String() }),
      },
      summary: 'Login and receive a JWT',
    },
  }, async (req, reply) => {
    const { username, password } = req.body as any;

    const loginRes = await fetch(`${app.config.USER_SERVICE_URL}/users/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (loginRes.status === 401) {
      return reply.code(401).send({ error: loginRes.statusText });
    }
    if (!loginRes.ok) {
      return reply.code(500).send({ error: loginRes.statusText });
    }
    let bodyData = {};
    if (username.includes('@')) {
      bodyData = { email: username };
    }
    else {
      bodyData = { username };
    }

    const lookupRes = await fetch(`${app.config.USER_SERVICE_URL}/users/lookup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(bodyData),
    });
    if (lookupRes.status === 404) {
      return reply.code(401).send({ error: lookupRes.statusText });
    }
    if (!lookupRes.ok) {
      return reply.code(500).send({ error: lookupRes.statusText });
    }

    const user = await lookupRes.json();

    if (user.isVerified !== 1) {
      return reply.code(303).send({ error: 'email not verified' });
    }

    const token = await reply.jwtSign({
      sub: user.id,
      username: user.username,
      email: user.email,
    });

    if (user.twoFactorEnabled === 1) {
      return reply.code(202).send({ token, user });
    }

    return reply.code(200).send({ token, user });
  });

  app.get('/auth/me', {
    preHandler: app.authenticate,
    schema: {
      tags: ['auth'],
      response: {
        200: Type.Object({
          user: Type.Any(),
        }),
        500: Type.Object({ error: Type.String() }),
      },
      summary: 'Return the current user info',
    },
  }, async (req, reply) => {
    const payload = req.user as any;
    const res = await fetch(`${app.config.USER_SERVICE_URL}/users/${payload.sub}`);
    if (!res.ok) return reply.code(500).send({ error: 'upstream error' });
    const user = await res.json();
    return reply.send({ user });
  });
};

export default routes;