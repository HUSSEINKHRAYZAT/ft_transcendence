import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import jwt from 'jsonwebtoken';
import WebSocket from 'ws';

type JWTPayload = { sub: number | string; username: string; email?: string };

const routes: FastifyPluginAsync = async (app) => {
  const conns = new Map<string, Set<WebSocket>>(); // username → sockets

  // Update presence by userId
  async function patchPresence(userId: number, isLoggedIn: 0 | 1) {
    try {
      await fetch(`${app.config.USER_SERVICE_URL}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isLoggedIn }),
      });
    } catch (err) {
      app.log.error({ err }, 'failed to PATCH presence');
    }
  }

  // Fetch friends (usernames)
  async function getFriends(userId: number): Promise<string[]> {
    try {
      const res = await fetch(`${app.config.USER_SERVICE_URL}/relation/friends/${userId}`);
      if (!res.ok) return [];
      const friends = await res.json();

      const usernames: string[] = [];
      for (const f of friends) {
        try {
          const u = await fetch(`${app.config.USER_SERVICE_URL}/users/${f.id}`).then((r) => r.json());
          if (u.username) usernames.push(u.username);
        } catch (err) {
          app.log.error({ err }, `failed to fetch username for id=${f.id}`);
        }
      }
      return usernames;
    } catch (err) {
      app.log.error({ err }, 'failed to fetch friends');
      return [];
    }
  }

  function add(username: string, ws: WebSocket) {
    let set = conns.get(username);
    if (!set) {
      set = new Set();
      conns.set(username, set);
    }
    set.add(ws);
  }

  function remove(username: string, ws: WebSocket) {
    const set = conns.get(username);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) {
      conns.delete(username);
    }
  }

  // ws://host:3005/ws?token=JWT
  app.get(
    '/ws',
    {
      websocket: true,
      schema: { querystring: Type.Object({ token: Type.String() }) },
    },
    (conn, req) => {
      const ws = conn as WebSocket;

      // 1) Auth
      let userId: number;
      let username: string;
      try {
        const { token } = req.query as { token: string };
        const payload = jwt.verify(token, app.config.AUTH_JWT_SECRET) as JWTPayload;
        userId = Number(payload.sub);
        username = String(payload.username);
        if (!userId || !username) throw new Error('missing sub/username');
      } catch {
        ws.close(4001, 'invalid token');
        return;
      }

      // 2) Register connection
      add(username, ws);

      // If first connection → mark online + notify friends
      if (conns.get(username)?.size === 1) {
        patchPresence(userId, 1);
        getFriends(userId).then((friends) => {
          for (const friendUsername of friends) {
            const friendConns = conns.get(friendUsername);
            if (friendConns) {
              for (const fws of friendConns) {
                try {
                  fws.send(JSON.stringify({ type: 'friend-online', username }));
                } catch {}
              }
            }
          }
        });
      }

      // welcome msg
      ws.send(JSON.stringify({ type: 'welcome', username }));

      // 3) Heartbeat
      (ws as any).isAlive = true;
      ws.on('pong', () => {
        (ws as any).isAlive = true;
      });
      const interval = setInterval(() => {
        if (!(ws as any).isAlive) {
          try {
            ws.terminate();
          } catch {}
        } else {
          (ws as any).isAlive = false;
          try {
            ws.ping();
          } catch {}
        }
      }, app.config.HEARTBEAT_MS);

      // 4) Messages
      ws.on('message', async (buf: WebSocket.RawData) => {
        try {
          if (!buf) return;
          const text = Buffer.isBuffer(buf) ? buf.toString() : buf.toString();
          const msg = JSON.parse(text);

          if (msg?.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          } else if (msg?.type === 'direct-message') {
            const to = String(msg.to || '').trim();
            const messageText = String(msg.text || '').trim();

            if (!to || !messageText) {
              ws.send(JSON.stringify({ type: 'error', error: 'Invalid direct-message payload' }));
              return;
            }

            // check friendship
            const friends = await getFriends(userId);
            if (!friends.includes(to)) {
              ws.send(JSON.stringify({ type: 'error', error: 'Recipient is not your friend' }));
              return;
            }

            // send to target if online
            const recipients = conns.get(to);
            if (recipients && recipients.size > 0) {
              for (const peer of recipients) {
                try {
                  peer.send(JSON.stringify({ type: 'direct-message', from: username, text: messageText }));
                } catch {}
              }
            } else {
              ws.send(JSON.stringify({ type: 'error', error: 'User is offline' }));
            }
          }
        } catch (err) {
          app.log.error({ err }, 'failed to parse ws message');
        }
      });

      ws.on('close', () => {
        clearInterval(interval);
        const before = conns.get(username)?.size ?? 0;
        remove(username, ws);

        // If last connection → offline + notify friends
        if (before === 1) {
          patchPresence(userId, 0);
          getFriends(userId).then((friends) => {
            for (const friendUsername of friends) {
              const friendConns = conns.get(friendUsername);
              if (friendConns) {
                for (const fws of friendConns) {
                  try {
                    fws.send(JSON.stringify({ type: 'friend-offline', username }));
                  } catch {}
                }
              }
            }
          });
        }
      });
    }
  );
};

export default routes;
