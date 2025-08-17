/**
 * Socket.IO Server for FT_PONG Real-time Multiplayer
 * Simple local server for testing remote multiplayer functionality
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
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"],
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
    this.players = new Map();
    this.isGameStarted = false;
    this.gameState = null;
    this.maxPlayers = gameMode === '4p' ? 4 : 2;
    this.createdAt = Date.now();
  }

  addPlayer(playerId, playerData) {
    if (this.players.size >= this.maxPlayers) {
      return false;
    }
    
    this.players.set(playerId, {
      id: playerId,
      name: playerData.name,
      isReady: false,
      joinedAt: Date.now()
    });
    
    return true;
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    
    // If host leaves, assign new host
    if (playerId === this.hostId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value;
    }
  }

  getInfo() {
    return {
      roomId: this.id,
      hostId: this.hostId,
      players: Array.from(this.players.values()),
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
      name: data.name || 'Player',
      currentRoom: null,
      connectedAt: Date.now()
    });
    
    console.log(`👤 Player registered: ${data.name} (${socket.id})`);
  });

  // Create room
  socket.on('create_room', (data) => {
    const roomId = generateRoomId();
    const room = new GameRoom(roomId, socket.id, data.gameMode);
    
    // Add host to room
    room.addPlayer(socket.id, { name: data.playerName });
    rooms.set(roomId, room);
    
    // Update player's current room
    const player = players.get(socket.id);
    if (player) {
      player.currentRoom = roomId;
    }
    
    // Join socket room
    socket.join(roomId);
    
    console.log(`🏠 Room created: ${roomId} by ${data.playerName}`);
    socket.emit('room_created', room.getInfo());
  });

  // Join room
  socket.on('join_room', (data) => {
    const room = rooms.get(data.roomId);
    
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
    
    // Add player to room
    const success = room.addPlayer(socket.id, { name: data.playerName });
    
    if (!success) {
      socket.emit('error', 'Could not join room');
      return;
    }
    
    // Update player's current room
    const player = players.get(socket.id);
    if (player) {
      player.currentRoom = data.roomId;
    }
    
    // Join socket room
    socket.join(data.roomId);
    
    console.log(`🚪 ${data.playerName} joined room: ${data.roomId}`);
    
    // Notify player they joined
    socket.emit('room_joined', room.getInfo());
    
    // Notify other players about the new player
    broadcastToRoom(data.roomId, 'player_joined', {
      id: socket.id,
      name: data.playerName
    }, socket.id);
    
    // Send updated room info to all players
    broadcastToRoom(data.roomId, 'room_updated', room.getInfo());
    
    // Send current room state to the joining player
    socket.emit('room_state', {
      playerCount: room.players.size,
      maxPlayers: room.maxPlayers,
      players: Array.from(room.players.values())
    });
  });

  // Leave room
  socket.on('leave_room', (data) => {
    const room = rooms.get(data.roomId);
    if (!room) return;
    
    const player = room.players.get(socket.id);
    if (player) {
      room.removePlayer(socket.id);
      socket.leave(data.roomId);
      
      // Update player's current room
      const playerData = players.get(socket.id);
      if (playerData) {
        playerData.currentRoom = null;
      }
      
      console.log(`👋 ${player.name} left room: ${data.roomId}`);
      
      // Notify other players
      broadcastToRoom(data.roomId, 'player_left', socket.id);
      
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

  // Start game
  socket.on('start_game', (data) => {
    const room = rooms.get(data.roomId);
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

  // Game state updates (host only)
  socket.on('game_state', (data) => {
    const room = rooms.get(data.roomId);
    if (!room || room.hostId !== socket.id) return;
    
    room.gameState = data.state;
    
    // Broadcast to other players
    broadcastToRoom(data.roomId, 'game_state', data.state, socket.id);
  });

  // Player input
  socket.on('player_input', (data) => {
    const room = rooms.get(data.roomId);
    if (!room) return;
    
    // Broadcast to all players (including sender for confirmation)
    io.to(data.roomId).emit('player_input', {
      playerId: data.playerId,
      input: data.input
    });
  });

  // Chat messages
  socket.on('chat_message', (data) => {
    const room = rooms.get(data.roomId);
    if (!room) return;
    
    const message = {
      id: Date.now().toString(),
      playerId: data.playerId,
      playerName: data.playerName,
      message: data.message,
      timestamp: data.timestamp,
      type: 'message'
    };
    
    // Broadcast to all players in room
    io.to(data.roomId).emit('chat_message', message);
    
    console.log(`💬 [${data.roomId}] ${data.playerName}: ${data.message}`);
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Player disconnected: ${socket.id} (${reason})`);
    
    const player = players.get(socket.id);
    if (player && player.currentRoom) {
      const room = rooms.get(player.currentRoom);
      if (room) {
        room.removePlayer(socket.id);
        
        // Notify other players
        broadcastToRoom(player.currentRoom, 'player_left', socket.id);
        
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
  console.log(`🌐 CORS enabled for localhost:5173, 5174, 5175, 3000`);
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