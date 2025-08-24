/**
 * Socket.IO Server for FT_PONG Real-time Multiplayer
 * Improved with stable player seat indices and richer payloads.
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = createServer(app);

// Configure CORS for Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:3000",
      // Optional if you test via 127.0.0.1
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:5175",
      "http://127.0.0.1:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Enable CORS for Express
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Game state management
const rooms = new Map();
const players = new Map();

class GameRoom {
  constructor(id, hostId, gameMode = '2p') {
    this.id = id;
    this.hostId = hostId;
    this.gameMode = gameMode;
    this.players = new Map(); // socketId -> { id, name, index, isReady, joinedAt }
    this.isGameStarted = false;
    this.gameState = null;
    this.maxPlayers = gameMode === '4p' ? 4 : 2;
    this.createdAt = Date.now();
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
    const entry = {
      id: playerId,
      name: playerData.name,
      index,
      isReady: false,
      joinedAt: Date.now()
    };
    this.players.set(playerId, entry);
    return { ok: true, index, player: entry };
  }

  removePlayer(playerId) {
    const leaving = this.players.get(playerId);
    this.players.delete(playerId);
    // If host leaves, assign new host
    if (playerId === this.hostId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value;
    }
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
        joinedAt: p.joinedAt
      })),
      gameMode: this.gameMode,
      isGameStarted: this.isGameStarted,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers
    };
  }

  isFull() {
    return this.players.size >= this.maxPlayers;
  }

  isEmpty() {
    return this.players.size === 0;
  }
}

// Utility functions
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function broadcastToRoom(roomId, event, data, excludePlayerId = null) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.players.forEach((player, playerId) => {
    if (playerId !== excludePlayerId) {
      const socket = io.sockets.sockets.get(playerId);
      if (socket) {
        socket.emit(event, data);
      }
    }
  });
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`🔌 Player connected: ${socket.id}`);

  // Register player
  socket.on('register_player', (data) => {
    players.set(socket.id, {
      id: socket.id,
      name: data?.name || 'Player',
      currentRoom: null,
      connectedAt: Date.now()
    });
    console.log(`👤 Player registered: ${data?.name || 'Player'} (${socket.id})`);
  });

  // Create room
  socket.on('create_room', (data) => {
    const roomId = generateRoomId();
    const mode = data?.gameMode === '4p' ? '4p' : '2p';
    const room = new GameRoom(roomId, socket.id, mode);

    // Add host to room with preferred index 0
    const added = room.addPlayer(socket.id, { name: data?.playerName || 'Host' }, 0);
    if (!added.ok) {
      socket.emit('error', 'Failed to seat host');
      return;
    }

    rooms.set(roomId, room);

    // Update player's current room
    const player = players.get(socket.id);
    if (player) player.currentRoom = roomId;

    // Join socket room
    socket.join(roomId);

    console.log(`🏠 Room created: ${roomId} by ${data?.playerName || 'Host'}`);
    // Inform creator
    socket.emit('room_created', room.getInfo());
    socket.emit('player_assigned', { roomId, playerId: socket.id, index: added.index });
  });

  // Join room
  socket.on('join_room', (data) => {
    const room = rooms.get(data?.roomId);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    if (room.isFull()) {
      socket.emit('error', 'Room is full');
      return;
    }
    if (room.isGameStarted) {
      socket.emit('error', 'Game already started');
      return;
    }

    const added = room.addPlayer(socket.id, { name: data?.playerName || 'Player' });
    if (!added.ok) {
      socket.emit('error', 'Could not join room');
      return;
    }

    // Update player's current room
    const player = players.get(socket.id);
    if (player) player.currentRoom = data.roomId;

    // Join socket room
    socket.join(data.roomId);

    console.log(`🚪 ${data?.playerName || 'Player'} joined room: ${data.roomId}`);

    // Notify the joining player
    socket.emit('room_joined', room.getInfo());
    socket.emit('player_assigned', { roomId: data.roomId, playerId: socket.id, index: added.index });

    // Notify other players about the new player
    broadcastToRoom(data.roomId, 'player_joined', {
      id: socket.id,
      name: data?.playerName || 'Player',
      index: added.index
    }, socket.id);

    // Send updated room info to all players
    broadcastToRoom(data.roomId, 'room_updated', room.getInfo());
  });

  // Leave room
  socket.on('leave_room', (data) => {
    const room = rooms.get(data?.roomId);
    if (!room) return;

    const playerEntry = room.players.get(socket.id);
    if (playerEntry) {
      const leftIndex = room.removePlayer(socket.id);
      socket.leave(data.roomId);

      // Update player's current room
      const playerData = players.get(socket.id);
      if (playerData) playerData.currentRoom = null;

      console.log(`👋 ${playerEntry.name} left room: ${data.roomId}`);

      // Notify other players
      broadcastToRoom(data.roomId, 'player_left', { id: socket.id, index: leftIndex });

      // Remove empty rooms
      if (room.isEmpty()) {
        rooms.delete(data.roomId);
        console.log(`🗑️ Empty room deleted: ${data.roomId}`);
      } else {
        // Send updated room info
        broadcastToRoom(data.roomId, 'room_updated', room.getInfo());
      }
    }
  });

  // Start game (host only)
  socket.on('start_game', (data) => {
    const room = rooms.get(data?.roomId);
    if (!room || room.hostId !== socket.id) {
      socket.emit('error', 'Not authorized to start game');
      return;
    }

    room.isGameStarted = true;
    console.log(`🎮 Game started in room: ${data.roomId}`);

    // Notify all players
    io.to(data.roomId).emit('game_started');
    io.to(data.roomId).emit('room_updated', room.getInfo());
  });

  // Game state updates (host only, broadcast to others)
  socket.on('game_state', (data) => {
    const room = rooms.get(data?.roomId);
    if (!room || room.hostId !== socket.id) return;

    room.gameState = data.state;

    // Broadcast to other players (not the host)
    broadcastToRoom(data.roomId, 'game_state', data.state, socket.id);
  });

  // Player input — now includes seat index
  socket.on('player_input', (data) => {
    const room = rooms.get(data?.roomId);
    if (!room) return;

    const entry = room.players.get(socket.id);
    if (!entry) return;

    io.to(data.roomId).emit('player_input', {
      playerId: socket.id,
      index: entry.index,
      input: data.input,
      timestamp: Date.now()
    });
  });

  // Chat messages
  socket.on('chat_message', (data) => {
    const room = rooms.get(data?.roomId);
    if (!room) return;

    const entry = room.players.get(socket.id);
    const message = {
      id: Date.now().toString(),
      playerId: socket.id,
      playerName: entry?.name || data?.playerName || 'Player',
      index: entry?.index ?? null,
      message: data?.message ?? '',
      timestamp: Date.now(),
      type: 'message'
    };

    io.to(data.roomId).emit('chat_message', message);
    console.log(`💬 [${data.roomId}] ${message.playerName}: ${message.message}`);
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Player disconnected: ${socket.id} (${reason})`);

    const player = players.get(socket.id);
    if (player && player.currentRoom) {
      const room = rooms.get(player.currentRoom);
      if (room) {
        const leftIndex = room.removePlayer(socket.id);

        // Notify other players
        broadcastToRoom(player.currentRoom, 'player_left', { id: socket.id, index: leftIndex });

        // Remove empty rooms
        if (room.isEmpty()) {
          rooms.delete(player.currentRoom);
          console.log(`🗑️ Empty room deleted: ${player.currentRoom}`);
        } else {
          broadcastToRoom(player.currentRoom, 'room_updated', room.getInfo());
        }
      }
    }

    players.delete(socket.id);
  });
});

// Cleanup old rooms periodically
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes

  for (const [roomId, room] of rooms.entries()) {
    if (now - room.createdAt > maxAge && room.isEmpty()) {
      rooms.delete(roomId);
      console.log(`🧹 Cleaned up old empty room: ${roomId}`);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎮 FT_PONG Socket.IO Server running on port ${PORT}`);
  console.log(`🌐 CORS enabled for localhost/127.0.0.1:5173, 5174, 5175, 3000`);
  console.log(`📊 Active rooms: ${rooms.size}, Active players: ${players.size}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
