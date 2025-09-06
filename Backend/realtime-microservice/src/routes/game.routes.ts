import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';
import { SocketStream } from '@fastify/websocket';
import WebSocket from 'ws';
import { verifyToken } from '../utils/auth';
import { joinGame, leaveGame, tickAllGames } from '../services/gameManager';
import { broadcast } from '../services/broadcaster';

type GameQuery = { token: string; gameId: string };

const routes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: GameQuery }>(
    '/game-ws',
    {
      websocket: true,
      schema: { querystring: Type.Object({ token: Type.String(), gameId: Type.String() }) },
    },
    (connection: SocketStream, request: FastifyRequest<{ Querystring: GameQuery }>) => {
      const ws = connection.socket as unknown as WebSocket;

      let username: string;
      let userId: number;
      let gameId: string;

      try {
        const { token, gameId: gId } = request.query;
        const payload = verifyToken(token, process.env.AUTH_JWT_SECRET!);
        userId = payload.userId;
        username = payload.username;
        gameId = gId;
      } catch {
        ws.close(4001, 'invalid token/gameId');
        return;
      }

      const game = joinGame(gameId, username, ws);
      ws.send(JSON.stringify({ type: 'welcome', username, gameId }));
      broadcast(game.conns, { type: 'player-joined', username });

      ws.on('message', (buf: WebSocket.RawData) => {
        try {
          const msg = JSON.parse(buf.toString());

          if (msg.type === 'move') {
            game.state.paddles[username] = msg.y;
          } else if (msg.type === 'leave') {
            leaveGame(gameId, username);
            broadcast(game.conns, { type: 'player-left', username });
          } else if (msg.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (err) {
          app.log.error({ err }, 'failed to parse game message');
        }
      });

      ws.on('close', () => {
        leaveGame(gameId, username);
        broadcast(game.conns, { type: 'player-left', username });
      });
    }
  );

  setInterval(() => {
    tickAllGames();
  }, 1000 / 30);
};

export default routes;
