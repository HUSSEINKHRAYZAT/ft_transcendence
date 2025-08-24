import type { FastifyPluginAsync } from 'fastify';
import replyFrom from '@fastify/reply-from';
import { randomUUID } from 'crypto';

const routes: FastifyPluginAsync = async (app) => {
  await app.register(replyFrom, {
    undici: {
      headersTimeout: app.config.UPSTREAM_TIMEOUT_MS,
      bodyTimeout: app.config.UPSTREAM_TIMEOUT_MS,
    },
  });

  function pick(h: Record<string, any>, name: string) {
    const v = h[name.toLowerCase()];
    if (v == null) return undefined;
    return Array.isArray(v) ? v.join(', ') : String(v);
  }

  function buildUpstreamHeaders(req: any) {
    const h = req.headers as Record<string, any>;

    const allowed = [
      'authorization',
      'content-type',
      'accept',
      'accept-language',
      'user-agent',
      'cookie',
    ];

    const out: Record<string, string> = {};
    for (const name of allowed) {
      const v = pick(h, name);
      if (v) out[name] = v;
    }

    out['x-request-id'] = req.requestId || pick(h, 'x-request-id') || randomUUID();
    out['x-forwarded-host'] = pick(h, 'host') || '';
    out['x-forwarded-proto'] = (req.protocol as string) || 'http';

    return out;
  }

  const isPublic = (req: any) => {
    const url = req.raw.url || '';
    const m = req.method.toUpperCase();
    if (url === '/health') return true;
    if (url.startsWith('/auth/')) return true;
    if (m === 'POST' && url === '/users') return true;
    if (m === 'POST' && (url === '/users/verify' || url === '/users/send-verification' || url === '/users/getEmail' || url === '/users/reset-password')) return true;
    if (m === 'OPTIONS') return true;
    return false;
  };

  app.addHook('preHandler', async (req, reply) => {
    const url = req.raw.url || '';
    if (isPublic(req)) return;
    if (url.startsWith('/users') || url.startsWith('/statistics') || url.startsWith('/sessions')) {
      return app.authenticate(req, reply);
    }
  });

  app.all('/users', async (req, reply) => {
    const target = `${app.config.USER_SERVICE_URL}${req.raw.url}`;
    return reply.from(target, {
      rewriteRequestHeaders: () => buildUpstreamHeaders(req),
    });
  });

  app.all('/users/*', async (req, reply) => {
    const target = `${app.config.USER_SERVICE_URL}${req.raw.url}`;
    return reply.from(target, {
      rewriteRequestHeaders: () => buildUpstreamHeaders(req),
    });
  });

  app.all('/sessions', async (req, reply) => {
    const target = `${app.config.SESSION_SERVICE_URL}${req.raw.url}`;
    return reply.from(target, {
      rewriteRequestHeaders: () => buildUpstreamHeaders(req),
    });
  });

  app.all('/sessions/*', async (req, reply) => {
    const target = `${app.config.SESSION_SERVICE_URL}${req.raw.url}`;
    return reply.from(target, {
      rewriteRequestHeaders: () => buildUpstreamHeaders(req),
    });
  });

  app.all('/statistics', async (req, reply) => {
    const target = `${app.config.USER_SERVICE_URL}${req.raw.url}`;
    return reply.from(target, {
      rewriteRequestHeaders: () => buildUpstreamHeaders(req),
    });
  });

  app.all('/statistics/*', async (req, reply) => {
    const target = `${app.config.USER_SERVICE_URL}${req.raw.url}`;
    return reply.from(target, {
      rewriteRequestHeaders: () => buildUpstreamHeaders(req),
    });
  });

  app.all('/mailer/*', async (req, reply) => {
    const target = `${app.config.MAILER_URL}${req.raw.url!.replace(/^\/mailer/, '')}`;
    return reply.from(target, {
      rewriteRequestHeaders: () => buildUpstreamHeaders(req),
    });
  });
};

export default routes;