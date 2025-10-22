import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';
import { randomUUID } from 'crypto';

type PlayerCount = 2 | 4;

type MatchEntry = {
  matchId: string;
  roomId: string;
  code: string;
  gameMode: '2p' | '4p';
  hostId: string;
  hostName?: string;
  createdAt: number;
  players: Set<string>;
};

const matchesById = new Map<string, MatchEntry>();
const matchesByCode = new Map<string, MatchEntry>();
const MATCH_TTL_MS = 1000 * 60 * 60 * 6; // cleanup matches older than 6 hours

function cleanupExpiredMatches() {
  const now = Date.now();
  for (const entry of matchesById.values()) {
    if (now - entry.createdAt > MATCH_TTL_MS) {
      removeMatch(entry);
    }
  }
}

function removeMatch(entry: MatchEntry) {
  matchesById.delete(entry.matchId);
  matchesByCode.delete(entry.code);
}

function generateCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return code;
}

function computeWsUrl(req: FastifyRequest): string {
  const getHeader = (name: string) => {
    const value = (req.headers as any)[name.toLowerCase()];
    if (Array.isArray(value)) return value[0];
    return value as string | undefined;
  };

  const forwardedProto = getHeader('x-forwarded-proto');
  const forwardedHost = getHeader('x-forwarded-host');

  const protocol = forwardedProto ?? req.protocol ?? 'http';
  const wsProtocol = protocol.includes('https') ? 'wss' : 'ws';
  const host = forwardedHost ?? req.hostname ?? 'localhost';

  return `${wsProtocol}://${host}/ws`;
}

async function fetchUsers(app: FastifyInstance) {
  const res = await fetch(`${app.config.USER_SERVICE_URL}/users?limit=200`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch users: ${res.statusText}`);
  }
  return res.json();
}

const routes: FastifyPluginAsync = async (app) => {
  const ErrorResponse = Type.Object({ error: Type.String() });

  app.post('/pong/matches', {
    preHandler: app.authenticate,
    schema: {
      tags: ['pong'],
      body: Type.Object({
        playerCount: Type.Union([Type.Literal(2), Type.Literal(4)]),
      }),
      response: {
        200: Type.Object({
          wsUrl: Type.String(),
          roomId: Type.String(),
          code: Type.String(),
          matchId: Type.String(),
        }),
        400: ErrorResponse,
      },
      summary: 'Create a new online match session',
    },
  }, async (req, reply) => {
    cleanupExpiredMatches();

    const { playerCount } = req.body as { playerCount: PlayerCount };
    const payload = req.user as any;
    const hostId = String(payload?.sub ?? '');
    if (!hostId) {
      return reply.code(400).send({ error: 'missing_host_id' });
    }

    const wsUrl = computeWsUrl(req);
    const roomId = generateCode();
    const code = generateCode();
    const matchId = randomUUID();
    const entry: MatchEntry = {
      matchId,
      roomId,
      code,
      gameMode: playerCount === 4 ? '4p' : '2p',
      hostId,
      hostName: payload?.username ?? payload?.email ?? undefined,
      createdAt: Date.now(),
      players: new Set([hostId]),
    };

    matchesById.set(matchId, entry);
    matchesByCode.set(code, entry);

    return {
      wsUrl,
      roomId,
      code,
      matchId,
    };
  });

  app.post('/pong/matches/join', {
    preHandler: app.authenticate,
    schema: {
      tags: ['pong'],
      body: Type.Object({
        code: Type.String({ minLength: 4, maxLength: 8 }),
      }),
      response: {
        200: Type.Object({
          wsUrl: Type.String(),
          roomId: Type.String(),
          matchId: Type.String(),
        }),
        404: ErrorResponse,
      },
      summary: 'Join an existing online match by code',
    },
  }, async (req, reply) => {
    cleanupExpiredMatches();

    const { code } = req.body as { code: string };
    const match = matchesByCode.get(code.toUpperCase());
    if (!match) {
      return reply.code(404).send({ error: 'match_not_found' });
    }

    const payload = req.user as any;
    const userId = String(payload?.sub ?? '');
    if (userId) {
      match.players.add(userId);
    }

    return {
      wsUrl: computeWsUrl(req),
      roomId: match.roomId,
      matchId: match.matchId,
    };
  });

  app.post('/pong/matches/:matchId/result', {
    preHandler: app.authenticate,
    schema: {
      tags: ['pong'],
      params: Type.Object({
        matchId: Type.String(),
      }),
      body: Type.Object({
        matchId: Type.String(),
        winnerUserId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        scores: Type.Array(Type.Number()),
      }),
      response: {
        204: Type.Null(),
        404: ErrorResponse,
      },
      summary: 'Record the result of an online match',
    },
  }, async (req, reply) => {
    const { matchId } = req.params as { matchId: string };
    const entry = matchesById.get(matchId);
    if (!entry) {
      return reply.code(404).send({ error: 'match_not_found' });
    }
    removeMatch(entry);
    return reply.status(204).send();
  });

  app.get('/pong/sessions/active', {
    preHandler: app.authenticate,
    schema: {
      tags: ['pong'],
      response: {
        200: Type.Object({
          activeGames: Type.Array(Type.String()),
        }),
      },
      summary: 'List active online matches for the current user',
    },
  }, async (req) => {
    cleanupExpiredMatches();

    const payload = req.user as any;
    const userId = String(payload?.sub ?? '');
    const activeGames = Array.from(matchesById.values())
      .filter((entry) => entry.players.has(userId))
      .map((entry) => entry.code);

    return { activeGames };
  });

  app.post('/pong/sessions/end/:userId', {
    preHandler: app.authenticate,
    schema: {
      tags: ['pong'],
      params: Type.Object({
        userId: Type.String(),
      }),
      response: {
        204: Type.Null(),
        403: ErrorResponse,
      },
      summary: 'End all active matches for a user',
    },
  }, async (req, reply) => {
    const payload = req.user as any;
    const requesterId = String(payload?.sub ?? '');
    const { userId } = req.params as { userId: string };

    if (requesterId !== userId) {
      return reply.code(403).send({ error: 'forbidden' });
    }

    cleanupExpiredMatches();

    for (const entry of matchesById.values()) {
      if (entry.players.has(userId)) {
        removeMatch(entry);
      }
    }

    return reply.status(204).send();
  });

  app.get('/pong/players/online', {
    preHandler: app.authenticate,
    schema: {
      tags: ['pong'],
      response: {
        200: Type.Array(Type.Any()),
      },
      summary: 'List currently online players',
    },
  }, async (_req, reply) => {
    try {
      const users = await fetchUsers(app);
      if (!Array.isArray(users)) {
        return reply.send([]);
      }

      const onlineUsers = users
        .filter((user: any) => user?.status === 'online')
        .map((user: any) => ({
          id: String(user.id),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userName: user.username ?? user.userName ?? '',
          profilePath: user.profilePath ?? null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }));

      return onlineUsers;
    } catch (error) {
      app.log.error({ err: error }, 'failed to fetch online players');
      return reply.send([]);
    }
  });
};

export default routes;
