/**
 * Plain WebSocket server (Fastify) for FT_PONG
 * Adds stable seat indices like the Socket.IO server.
 */

const Fastify = require('fastify');
const WebSocket = require('ws');

const fastify = Fastify({ logger: false });

// In-memory state
const rooms = new Map();         // roomId -> GameRoom
const players = new Map();       // playerId -> { id, name, currentRoom, connectedAt, ip, ping }
const connections = new Map();   // playerId -> ws

class GameRoom {
  constructor(id, hostId, gameMode = '2p') {
    this.id = id;
    this.hostId = hostId;
    this.gameMode = gameMode;
    this.players = new Map(); // playerId -> { id, name, index, isReady, joinedAt, ping }
    this.isGameStarted = false;
    this.gameState = null;
    this.maxPlayers = gameMode === '4p' ? 4 : 2;
    this.lastActivity = Date.now();
  }

  getUsedIndices() {
    return new Set(Array.from(this.players.values()).map(p => p.index).filter(i => i !== undefined));
  }

  getAvailableIndex(preferIndex) {
    const used = this.getUsedIndices();
    const cap = this.maxPlayers;
    if (preferIndex !== undefined && preferIndex >= 0 && preferIndex < cap && !used.has(preferIndex)) {
      return preferIndex;
    }
    for (let i = 0; i < cap; i++) {
      if (!used.has(i)) return i;
    }
    return null;
  }

  addPlayer(playerId, playerData, preferIndex) {
    if (this.players.size >= this.maxPlayers) {
      return { ok: false, reason: 'full' };
    }
    const index = this.getAvailableIndex(preferIndex);
    if (index === null) {
      return { ok: false, reason: 'no-seat' };
    }
    this.players.set(playerId, {
      id: playerId,
      name: playerData.name,
      index,
      isReady: false,
      joinedAt: Date.now(),
      ping: 0
    });
    this.updateActivity();
    return { ok: true, index };
  }

  removePlayer(playerId) {
    const leaving = this.players.get(playerId);
    this.players.delete(playerId);
    if (playerId === this.hostId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value;
    }
    this.updateActivity();
    return leaving?.index;
  }

  getInfo() {
    return {
      roomId: this.id,
      hostId: this.hostId,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        index: p.index,
        isReady: p.isReady,
        joinedAt: p.joinedAt,
        ping: p.ping || 0
      })),
      gameMode: this.gameMode,
      isGameStarted: this.isGameStarted,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
      lastActivity: this.lastActivity
    };
  }

  isFull() { return this.players.size >= this.maxPlayers; }
  isEmpty() { return this.players.size === 0; }
  updateActivity() { this.lastActivity = Date.now(); }
}

// Utility
function generateRoomId() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }
function generatePlayerId() { return 'player_' + Math.random().toString(36).substring(2, 12); }

function sendToPlayer(playerId, message) {
  const ws = connections.get(playerId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcastToRoom(roomId, message, excludePlayerId = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.players.forEach((_, pid) => {
    if (pid !== excludePlayerId) sendToPlayer(pid, message);
  });
  room.updateActivity();
}

// Start Fastify and WebSocket server
async function start() {
  const PORT = process.env.PORT || 3002;

  // Basic health endpoint
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  const address = await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`🚀 Fastify listening on ${address}`);

  const wss = new WebSocket.Server({
    server: fastify.server,
    clientTracking: true,
    perMessageDeflate: { zlibDeflateOptions: { level: 3 } }
  });

  wss.on('connection', (ws, req) => {
    const playerId = generatePlayerId();
    let playerName = 'Player';
    let currentRoomId = null;
    let lastPingTime = Date.now();

    // Store connection
    connections.set(playerId, ws);
    players.set(playerId, {
      id: playerId, name: playerName, currentRoom: null,
      connectedAt: Date.now(), ip: req.socket.remoteAddress, ping: 0
    });

    console.log(`🔌 WebSocket connected: ${playerId} from ${req.socket.remoteAddress}`);

    // Welcome
    ws.send(JSON.stringify({ type: 'connected', playerId, message: 'Connected to WebSocket server' }));

    ws.on('message', (data) => {
      let message;
      try { message = JSON.parse(data.toString()); }
      catch (e) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        return;
      }
      const { type, data: payload } = message;

      switch (type) {
        case 'register_player': {
          playerName = payload?.name || 'Player';
          const p = players.get(playerId);
          if (p) p.name = playerName;
          ws.send(JSON.stringify({ type: 'player_registered', playerId, name: playerName }));
          console.log(`👤 Player registered: ${playerName} (${playerId})`);
          break;
        }

        case 'create_room': {
          const roomId = generateRoomId();
          const gameMode = payload?.gameMode === '4p' ? '4p' : '2p';
          const room = new GameRoom(roomId, playerId, gameMode);
          const added = room.addPlayer(playerId, { name: payload?.playerName || playerName }, 0);
          if (!added.ok) {
            ws.send(JSON.stringify({ type: 'error', message: 'Failed to seat host' }));
            break;
          }
          rooms.set(roomId, room);
          currentRoomId = roomId;
          const p = players.get(playerId);
          if (p) p.currentRoom = roomId;

          console.log(`🏠 WebSocket room created: ${roomId} by ${playerName}`);

          ws.send(JSON.stringify({ type: 'room_created', data: room.getInfo() }));
          ws.send(JSON.stringify({ type: 'player_assigned', data: { roomId, playerId, index: added.index } }));
          break;
        }

        case 'join_room': {
          const targetRoom = rooms.get(payload?.roomId);
          if (!targetRoom) { ws.send(JSON.stringify({ type: 'error', message: 'Room not found' })); break; }
          if (targetRoom.isFull()) { ws.send(JSON.stringify({ type: 'error', message: 'Room is full' })); break; }
          if (targetRoom.isGameStarted) { ws.send(JSON.stringify({ type: 'error', message: 'Game already started' })); break; }

          const added = targetRoom.addPlayer(playerId, { name: payload?.playerName || playerName });
          if (!added.ok) { ws.send(JSON.stringify({ type: 'error', message: 'Could not join room' })); break; }

          currentRoomId = payload.roomId;
          const p = players.get(playerId);
          if (p) p.currentRoom = payload.roomId;

          console.log(`🚪 ${playerName} joined WebSocket room: ${payload.roomId}`);

          ws.send(JSON.stringify({ type: 'room_joined', data: targetRoom.getInfo() }));
          ws.send(JSON.stringify({ type: 'player_assigned', data: { roomId: payload.roomId, playerId, index: added.index } }));

          broadcastToRoom(payload.roomId, { type: 'player_joined', data: { id: playerId, name: playerName, index: added.index } }, playerId);
          broadcastToRoom(payload.roomId, { type: 'room_updated', data: targetRoom.getInfo() });
          break;
        }

        case 'leave_room': {
          if (currentRoomId) {
            const room = rooms.get(currentRoomId);
            if (room) {
              const leftIndex = room.removePlayer(playerId);
              const p = players.get(playerId);
              if (p) p.currentRoom = null;

              broadcastToRoom(currentRoomId, { type: 'player_left', data: { id: playerId, index: leftIndex } });
              if (room.isEmpty()) {
                rooms.delete(currentRoomId);
                console.log(`🗑️ Cleaned up empty room: ${currentRoomId}`);
              } else {
                broadcastToRoom(currentRoomId, { type: 'room_updated', data: room.getInfo() });
              }
            }
            currentRoomId = null;
          }
          break;
        }

        case 'start_game': {
          const room = rooms.get(payload?.roomId);
          if (!room || room.hostId !== playerId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not authorized to start game' }));
            break;
          }
          room.isGameStarted = true;
          console.log(`🎮 WebSocket game started in room: ${payload.roomId}`);
          broadcastToRoom(payload.roomId, { type: 'game_started', data: { roomId: payload.roomId } });
          break;
        }

        case 'game_state': {
          const room = rooms.get(payload?.roomId);
          if (!room || room.hostId !== playerId) break;
          room.gameState = payload.state;
          broadcastToRoom(payload.roomId, { type: 'game_state', data: payload.state }, playerId);
          break;
        }

        case 'player_input': {
          const room = rooms.get(payload?.roomId);
          if (!room) break;
          const entry = room.players.get(playerId);
          if (!entry) break;

          broadcastToRoom(payload.roomId, {
            type: 'player_input',
            data: { playerId, index: entry.index, input: payload.input, timestamp: Date.now() }
          });
          break;
        }

        case 'chat_message': {
          const room = rooms.get(payload?.roomId);
          if (!room) break;
          const entry = room.players.get(playerId);
          broadcastToRoom(payload.roomId, {
            type: 'chat_message',
            data: {
              id: Date.now().toString(),
              playerId,
              playerName: entry?.name || playerName,
              index: entry?.index ?? null,
              message: payload?.message ?? '',
              timestamp: Date.now()
            }
          });
          console.log(`💬 [${payload.roomId}] ${(entry?.name || playerName)}: ${payload?.message ?? ''}`);
          break;
        }

        case 'ping': {
          lastPingTime = Date.now();
          ws.send(JSON.stringify({ type: 'pong', timestamp: lastPingTime }));
          break;
        }

        default:
          ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${type}` }));
      }
    });

    ws.on('close', () => {
      // Leave room if connected
      if (currentRoomId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          const leftIndex = room.removePlayer(playerId);
          broadcastToRoom(currentRoomId, { type: 'player_left', data: { id: playerId, index: leftIndex } });
          if (room.isEmpty()) rooms.delete(currentRoomId);
          else broadcastToRoom(currentRoomId, { type: 'room_updated', data: room.getInfo() });
        }
      }
      connections.delete(playerId);
      players.delete(playerId);
      console.log(`🔌 WebSocket disconnected: ${playerId}`);
    });

    ws.on('error', (err) => console.error(`❌ WebSocket error for ${playerId}:`, err));

    // Ping/pong for health
    ws.on('pong', () => {
      const p = players.get(playerId);
      if (p) p.ping = Date.now() - lastPingTime;
    });
  });

  // Cleanup and health monitoring
  setInterval(() => {
    const now = Date.now();
    // Clean up old idle rooms
    const maxAge = 30 * 60 * 1000; // 30 minutes
    for (const [roomId, room] of rooms.entries()) {
      if (now - room.lastActivity > maxAge && room.isEmpty()) {
        rooms.delete(roomId);
        console.log(`🧹 Cleaned up old WebSocket room: ${roomId}`);
      }
    }
    // Ping all connections
    connections.forEach((ws, playerId) => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
      else {
        connections.delete(playerId);
        players.delete(playerId);
      }
    });
  }, 30 * 1000);

  console.log(`🎮 FT_PONG WS Server running on port ${PORT}`);
}

start().catch((err) => {
  console.error('❌ Failed to start WS server:', err);
  process.exit(1);
});

module.exports = { fastify };
