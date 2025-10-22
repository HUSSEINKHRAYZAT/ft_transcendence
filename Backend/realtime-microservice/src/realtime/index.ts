import { WebSocketServer, WebSocket } from 'ws';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { GameRoom } from './room.js';
import type { InboundMsg, OutboundMsg, Player } from './types.js';

type WSClient = WebSocket & { _id?: string };

export const rooms = new Map<string, GameRoom>();
export const players = new Map<string, Player>();
const sockets = new Map<string, WSClient>();

let wss: WebSocketServer | null = null;
let cleanupTimer: NodeJS.Timeout | null = null;

export function initRealtime(fastify: FastifyInstance) {
  wss = new WebSocketServer({
    server: fastify.server,
    maxPayload: config.WS_MAX_MSG_SIZE
  });

  wss.on('connection', (ws: WSClient) => {
    const id = randomUUID();
    ws._id = id;
    sockets.set(id, ws);
    fastify.log.info(`🔌 Player connected: ${id}`);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as InboundMsg;
        handleMessage(fastify, id, ws, msg);
      } catch {
        send(ws, { type: 'error', error: 'Invalid JSON message' });
      }
    });

    ws.on('close', () => {
      handleDisconnect(fastify, id);
    });

    ws.on('error', (err) => {
      fastify.log.error({ err }, 'WS error');
    });
  });

  // periodic cleanup of empty rooms
  cleanupTimer = setInterval(() => cleanupOldRooms(fastify), config.CLEANUP_INTERVAL_MS);

  return wss;
}

export async function closeRealtime() {
  if (cleanupTimer) clearInterval(cleanupTimer);
  if (wss) {
    broadcast({ type: 'server_shutdown', message: 'Server is shutting down' });
    await new Promise<void>((resolve) => wss!.close(() => resolve()));
  }
  sockets.clear();
  players.clear();
  rooms.clear();
}

/* ------------------------ Helpers ------------------------ */

function send(ws: WSClient, payload: OutboundMsg) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function emitToRoom(roomId: string, payload: OutboundMsg) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const playerId of room.players.keys()) {
    const s = sockets.get(playerId);
    if (s && s.readyState === WebSocket.OPEN) {
      s.send(JSON.stringify(payload));
    }
  }
}

function emitToRoomExcept(roomId: string, exceptPlayerId: string, payload: OutboundMsg) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const playerId of room.players.keys()) {
    if (playerId === exceptPlayerId) continue;
    const s = sockets.get(playerId);
    if (s && s.readyState === WebSocket.OPEN) {
      s.send(JSON.stringify(payload));
    }
  }
}

function broadcast(payload: OutboundMsg) {
  for (const s of sockets.values()) {
    if (s.readyState === WebSocket.OPEN) {
      s.send(JSON.stringify(payload));
    }
  }
}

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generateUniqueRoomCode(): string {
  let code: string;
  do code = generateRoomCode();
  while (rooms.has(code));
  return code;
}

function cleanupOldRooms(fastify: FastifyInstance) {
  const now = Date.now();
  let cleaned = 0;
  for (const [roomId, room] of rooms.entries()) {
    if (room.getPlayerCount() === 0) {
      const ageMin = (now - room.createdAt) / (1000 * 60);
      if (ageMin > config.EMPTY_ROOM_MAX_AGE_MIN) {
        rooms.delete(roomId);
        cleaned++;
      }
    }
  }
  if (cleaned > 0) fastify.log.info(`🧹 Cleaned ${cleaned} empty rooms`);
}

/* ------------------------ Handlers ------------------------ */

function handleDisconnect(fastify: FastifyInstance, playerId: string) {
  fastify.log.info(`🔌 Player disconnected: ${playerId}`);
  const player = players.get(playerId);
  sockets.delete(playerId);

  if (player && player.roomId) {
    const room = rooms.get(player.roomId);
    if (room) {
      room.removePlayer(playerId);
      emitToRoom(room.id, { type: 'player_left', id: playerId });
      if (room.getPlayerCount() === 0) {
        rooms.delete(room.id);
        fastify.log.info(`🗑️ Room ${room.id} deleted (empty)`);
      } else {
        emitToRoom(room.id, { type: 'room_updated', ...room.info() });
      }
    }
  }
  players.delete(playerId);
}

function handleMessage(fastify: FastifyInstance, playerId: string, ws: WSClient, msg: InboundMsg) {
  switch (msg.type) {
    case 'register_player': {
      const name = (msg.name && String(msg.name).trim()) || 'Player';
      players.set(playerId, { id: playerId, name, roomId: null, connectedAt: Date.now() });
      send(ws, { type: 'registered', id: playerId, name });
      break;
    }

    case 'create_room': {
      const p = players.get(playerId);
      if (!p) return send(ws, { type: 'error', error: 'Player not registered' });
      const gameMode = (msg.gameMode === '4p' ? '4p' : '2p') as '2p' | '4p';
      const roomId = generateUniqueRoomCode();
      const room = new GameRoom(roomId, playerId, p.name, gameMode);
      rooms.set(roomId, room);
      p.roomId = roomId;
      send(ws, { type: 'room_created', ...room.info() });
      emitToRoom(roomId, { type: 'room_updated', ...room.info() });
      break;
    }

    case 'join_room': {
      const p = players.get(playerId);
      if (!p) return send(ws, { type: 'error', error: 'Player not registered' });
      const roomId = String(msg.roomId || '');
      const room = rooms.get(roomId);
      if (!room) return send(ws, { type: 'error', error: 'Room not found' });
      if (room.isGameStarted) return send(ws, { type: 'error', error: 'Game already in progress' });

      const displayName = (msg.playerName && String(msg.playerName).trim()) || p.name;
      const added = room.addPlayer(playerId, displayName);
      if (!added) return send(ws, { type: 'error', error: 'Room is full' });

      p.roomId = roomId;

      const playersArray = Array.from(room.players.values());
      const gameConfig = {
        players: playersArray.map((pl, index) => ({
          ...pl,
          playerIndex: index,
          isHost: pl.id === room.hostId
        })),
        gameMode: room.gameMode,
        roomId: room.id
      };

      send(ws, {
        type: 'room_joined',
        ...room.info(),
        gameConfig,
        yourPlayerIndex: playersArray.findIndex(pl => pl.id === playerId)
      });

      emitToRoom(roomId, {
        type: 'player_joined',
        id: playerId,
        name: displayName,
        playerIndex: playersArray.length - 1
      });
      emitToRoom(roomId, { type: 'room_updated', ...room.info() });

      if (room.players.size >= 2) {
        emitToRoom(roomId, {
          type: 'game_ready',
          hostPlayer: { ...playersArray[0], playerIndex: 0 },
          joinerPlayer: { ...playersArray[1], playerIndex: 1 },
          gameMode: room.gameMode
        });
      }
      break;
    }

    case 'leave_room': {
      const p = players.get(playerId);
      if (!p || !p.roomId) return;
      const room = rooms.get(p.roomId);
      if (!room) {
        p.roomId = null;
        return;
      }
      room.removePlayer(playerId);
      p.roomId = null;

      emitToRoom(room.id, { type: 'player_left', id: playerId });

      if (room.getPlayerCount() === 0) {
        rooms.delete(room.id);
      } else {
        emitToRoom(room.id, { type: 'room_updated', ...room.info() });
      }
      break;
    }

    case 'start_game': {
      const p = players.get(playerId);
      if (!p || !p.roomId) return send(ws, { type: 'error', error: 'Not in a room' });
      const room = rooms.get(p.roomId);
      if (!room) return send(ws, { type: 'error', error: 'Room not found' });
      if (room.hostId !== playerId) return send(ws, { type: 'error', error: 'Only host can start' });
      if (!room.canStartGame()) return send(ws, { type: 'error', error: 'Need at least 2 players' });

      const started = room.startGame();
      if (started) {
        const playersArray = Array.from(room.players.values());
        emitToRoom(room.id, {
          type: 'game_started',
          players: playersArray.map((pl, idx) => ({
            ...pl,
            playerIndex: idx,
            isHost: pl.id === room.hostId
          })),
          gameState: room.gameState
        });
        emitToRoom(room.id, { type: 'room_updated', ...room.info() });
      }
      break;
    }

    case 'game_state': {
      const p = players.get(playerId);
      if (!p || !p.roomId) return;
      const room = rooms.get(p.roomId);
      if (!room || !room.isGameStarted) return;

      // gameEnd
      if (msg.gameEnd) {
        if (room.hostId === playerId) {
          emitToRoom(room.id, { type: 'game_state', gameEnd: true, winnerName: msg.winnerName });
        }
        return;
      }

      // gameExit
      if (msg.gameExit) {
        const playerName = p.name || 'Unknown';
        const payload = {
          type: 'game_exit',
          exitedBy: msg.exitedBy || playerName,
          reason: msg.reason || 'Player exited the game',
          finalScores: msg.finalScores || [0, 0],
          timestamp: msg.timestamp || Date.now()
        };
        emitToRoom(room.id, payload);
        emitToRoom(room.id, { ...payload, type: 'game_state', gameExit: true, });
        return;
      }

      // pauseToggle
      if (typeof msg.pauseToggle !== 'undefined') {
        const playerName = p.name || 'Unknown';
        room.isPaused = !!msg.isPaused;
        room.pausedBy = playerName;
        emitToRoom(room.id, {
          type: 'game_state',
          pauseToggle: true,
          isPaused: !!msg.isPaused,
          pausedBy: playerName
        });
        return;
      }

      // authoritative updates from host only
      if (room.hostId === playerId && msg.state) {
        const state = msg.state;
        if (state.scores) {
          const arr = Array.from(room.players.values());
          const hostScore = state.scores[0] ?? 0;
          const joinerScore = state.scores[1] ?? 0;

          room.gameState = {
            ...state,
            scores: [hostScore, joinerScore],
            playerAssignment: {
              0: arr[0]?.id,
              1: arr[1]?.id
            },
            lastUpdate: Date.now()
          };
        } else {
          room.gameState = { ...state, lastUpdate: Date.now() };
        }

        // ✅ broadcast to everyone except host with consistent shape
        emitToRoomExcept(room.id, playerId, {
          type: 'game_state',
          state: room.gameState
        });
      }
      break;
    }

    case 'player_input': {
      const p = players.get(playerId);
      if (!p || !p.roomId) return;
      const room = rooms.get(p.roomId);
      if (!room || !room.isGameStarted) return;

      const arr = Array.from(room.players.values());
      let playerIndex = -1;
      if (playerId === room.hostId) playerIndex = 0;
      else {
        const idx = arr.findIndex(pl => pl.id === playerId);
        if (idx > 0) playerIndex = idx;
      }

      if (playerIndex >= 0) {
        if (playerId !== room.hostId) {
          const hostSocket = sockets.get(room.hostId);
          if (hostSocket && hostSocket.readyState === WebSocket.OPEN) {
            hostSocket.send(
              JSON.stringify({ type: 'player_input', playerId, playerIndex, input: msg.input })
            );
          }
        }

        for (const [pid, s] of sockets) {
          if (pid !== playerId && players.get(pid)?.roomId === room.id && s.readyState === WebSocket.OPEN) {
            s.send(JSON.stringify({ type: 'player_input', playerId, playerIndex, input: msg.input }));
          }
        }
      }
      break;
    }

    case 'chat_message': {
      const p = players.get(playerId);
      if (!p || !p.roomId) return;
      const message = {
        type: 'chat_message',
        id: randomUUID(),
        playerId,
        playerName: p.name,
        message: String(msg.message || ''),
        timestamp: Date.now()
      };
      emitToRoom(p.roomId, message);
      break;
    }

    default:
      send(ws, { type: 'error', error: `Unknown message type: ${msg.type}` });
  }
}
