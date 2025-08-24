import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { usersService } from '../services/users.service';
import { CreateUserBody, CreateUserReply, UpdateUserBody, User, ErrorResponse } from '../schemas/users.schema';
import { hashPassword, verifyPassword } from '../utils/hash';

const plugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  const svc = usersService(app);

  app.post(
    '/',
    {
      schema: {
        tags: ['users'],                                
        body: CreateUserBody,                           
        response: { 201: CreateUserReply, 409: ErrorResponse },
        summary: 'Create user and trigger verification email (code provided by frontend)',
      },
    },
    async (req, reply) => {
      const body = req.body as any;                     
      const hashed = await hashPassword(body.password); 
      try {
        const newId = svc.createUser({                  
          ...body,
          password: hashed,
        });
        const created = svc.getUserById(newId);
        return reply.status(201).send(created);         
      } catch (e: any) {
        if (String(e.message).includes('UNIQUE')) {     
          return reply.status(409).send({ error: 'username or email already exists' });
        }
        throw e;                                        
      }
    }
  );

  app.post(
    '/send-verification',
    {
      schema: {
        tags: ['users'],
        body: Type.Object({
          email: Type.String({ format: 'email' }),
          code: Type.String(),
        }, { additionalProperties: false }),
        response: { 200: Type.Null(), 404: ErrorResponse },
        summary: 'Send verification email to user',
      },
    },
    async (req, reply) => {
      const { email, firstName, code } = req.body as any;
      const user = svc.getUserByEmail(email);
      if (!user) return reply.status(404).send({ error: 'not found' });
      fetch(`${app.config.MAILER_URL}/send/verification`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to: email, firstName: user.firstName, code }),
      }).catch((err) => app.log.error({ err }, 'mailer call failed'));
      return reply.status(200).send();
    } 
  )

  app.post('/lookup', {
    schema: {
      tags: ['users'],
      body: Type.Object({
        username: Type.Optional(Type.String()),
        email: Type.Optional(Type.String({ format: 'email' })),
      }, { additionalProperties: false }),
      response: { 200: User, 404: ErrorResponse, 400: ErrorResponse },
      summary: 'Lookup a user by username or email (safe fields only)',
    },
  }, async (req, reply) => {
    const { username, email } = req.body as any;
    let user;
    if (username) {
      user = svc.getUserByUsername(username);
    }
    else if (email) user = svc.getUserByEmail(email);
    else return reply.code(400).send({ error: 'username or email required' });
    if (!user) return reply.code(404).send({ error: 'not found' });
    return user;
  });

  app.post('/getEmail', {
    schema: {
      tags: ['users'],
      body: Type.Object({
        username: Type.String(),
      }, { additionalProperties: false }),
      response: { 200: Type.Object({ email: Type.String({ format: 'email' }) }), 404: ErrorResponse, 400: ErrorResponse },
      summary: 'get email of a user by username or email (safe fields only)',
    },
  }, async (req, reply) => {
    const { username } = req.body as any;
    let user;
    if (username.includes('@')) {
      user = await svc.getUserByEmail(username);
    }
    else user = await svc.getUserByUsername(username);
    if (!user) return reply.code(404).send({ error: 'user not found' });
    return {email: user.email};
  });

  app.post('/verify', {
    schema: {
      tags: ['users'],
      body: Type.Object({
        email: Type.String({ format: 'email' }),
      }, { additionalProperties: false }),
      response: { 200: User, 404: ErrorResponse, 400: ErrorResponse },
      summary: 'verify email',
    },
  }, async (req, reply) => {
    const { email } = req.body as any;
    const changes = svc.verifyMail(email);
    if (!changes) return reply.status(404).send({ error: 'not found' });
    return svc.getUserByEmail(email);
  });

  app.get(
    '/',
    {
      schema: {
        tags: ['users'],
        querystring: Type.Object({
          limit: Type.Optional(Type.Number()),
          offset: Type.Optional(Type.Number()),
        }),
        response: { 200: Type.Array(User) },
        summary: 'List users',
      },
    },
    async (req) => {
      const { limit = 50, offset = 0 } = (req.query as any) ?? {};
      return svc.listUsers(limit, offset);
    }
  );

  app.get(
    '/:id',
    {
      schema: {
        tags: ['users'],
        params: Type.Object({ id: Type.Number() }),
        response: { 200: User, 404: ErrorResponse },
        summary: 'Get a user by id',
      },
    },
    async (req, reply) => {
      const { id } = req.params as any;
      const user = svc.getUserById(Number(id));
      if (!user) return reply.status(404).send({ error: 'not found' });
      return user;
    }
  );

  app.patch(
    '/:id',
    {
      schema: {
        tags: ['users'],
        params: Type.Object({ id: Type.Number() }),
        body: UpdateUserBody,
        response: { 200: User, 404: ErrorResponse },
        summary: 'Update a user',
      },
    },
    async (req, reply) => {
      const { id } = req.params as any;
      const changes = svc.updateUser(Number(id), req.body as any);
      if (!changes) return reply.status(404).send({ error: 'not found' });
      return svc.getUserById(Number(id));
    }
  );

  app.delete(
    '/:id',
    {
      schema: {
        tags: ['users'],
        params: Type.Object({ id: Type.Number() }),
        response: { 204: Type.Null(), 404: ErrorResponse },
        summary: 'Delete a user',
      },
    },
    async (req, reply) => {
      const { id } = req.params as any;
      const removed = svc.deleteUser(Number(id));
      if (!removed) return reply.status(404).send({ error: 'not found' });
      return reply.status(204).send();
    }
  );

  app.post(
    '/login',
    {
      schema: {
        tags: ['users'],
        body: Type.Object({ username: Type.String() ,password: Type.String() }),
        response: {
          200: Type.Object({ ok: Type.Boolean() }),
          401: ErrorResponse,
          404: ErrorResponse,
        },
        summary: 'Login with username/password',
      },
    },
    async (req, reply) => {
      const { username, password } = req.body as any;
      let row;
      if (username.includes('@')) {
        row = svc.getUserByEmail(username);
        if (!row) return reply.status(401).send({ error: 'invalid email' });
      }
      else {
        row = svc.getUserSensitiveByUsername(username) as any;
        if (!row) return reply.status(401).send({ error: 'invalid username' });
      }
      const ok = await verifyPassword(password, row.hashedPassword);
      if (!ok) return reply.status(401).send({ error: 'invalid password' });
      const changes = svc.updateUser(Number(row.id), {isLoggedIn: 1});
      if (!changes) return reply.status(404).send({ error: 'Can\'t login' });
      return { ok: true };
    }
  );

  app.post(
    '/reset-password',
    {
      schema: {
        tags: ['users'],
        body: Type.Object({ email: Type.String({ format: 'email' }), newPassword: Type.String() }),
        response: {
          200: Type.Object({ ok: Type.Boolean() }),
          404: ErrorResponse,
        },
        summary: 'Reset password for user',
      },
    },
    async (req, reply) => {
      const { email, newPassword } = req.body as any;
      const user = svc.getUserByEmail(email);
      if (!user) return reply.status(404).send({ error: 'not found' });
      const newHashedPassword = await hashPassword(newPassword);
      const changes = svc.updatePassword(email, newHashedPassword);
      if (!changes) return reply.status(404).send({ error: 'Could not update password' });
      return { ok: true };
    }
  );
};

export default plugin;