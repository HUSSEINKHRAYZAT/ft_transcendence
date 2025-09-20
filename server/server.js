const fastify = require('fastify')({ logger: true });
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

// Register CORS plugin
fastify.register(require('@fastify/cors'), {
  origin: "*", // In production, specify your domain
  methods: ["GET", "POST"],
  credentials: true
});

// Enable Socket.IO
const io = socketIo(fastify.server, {
  cors: {
    origin: "*", // In production, specify your domain
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return {
    status: 'OK',
    message: 'FT Transcendence multiplayer server is running',
    timestamp: new Date().toISOString(),
    rooms: rooms.size,
    connectedPlayers: players.size
  };
});

// Game state storage
const rooms = new Map();
const players = new Map();
const gameStates = new Map(); // Store active game states

// Room class to manage game rooms
class GameRoom {
  constructor(id, hostId, hostName, gameMode = '2p') {
    this.id = id;
    this.hostId = hostId;
    this.gameMode = gameMode; // '2p' or '4p'
    this.maxPlayers = gameMode === '4p' ? 4 : 2;
    this.players = new Map();
    this.isGameStarted = false;
    this.gameState = null;
    this.createdAt = new Date();

    // Add host as first player
    this.addPlayer(hostId, hostName);
  }

  addPlayer(playerId, playerName) {
    if (this.players.size >= this.maxPlayers) {
      return false; // Room is full
    }

    this.players.set(playerId, {
      id: playerId,
      name: playerName,
      isReady: false,
      joinedAt: new Date()
    });

    return true;
  }

  removePlayer(playerId) {
    const removed = this.players.delete(playerId);

    // If host leaves, assign new host
    if (playerId === this.hostId && this.players.size > 0) {
      const newHost = Array.from(this.players.keys())[0];
      this.hostId = newHost;
    }

    return removed;
  }

  getPlayerCount() {
    return this.players.size;
  }

  canStartGame() {
    return this.players.size >= 2 && !this.isGameStarted;
  }

  startGame() {
    if (this.canStartGame()) {
      this.isGameStarted = true;
      
      // Initialize backend game state
      this.gameState = {
        ball: { x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0 },
        paddles: [
          { x: -15, y: 0, z: 0 }, // Host paddle (left)
          { x: 15, y: 0, z: 0 }   // Joiner paddle (right)
        ],
        scores: [0, 0], // [host_score, joiner_score]
        lastUpdate: Date.now()
      };
      
      return true;
    }
    return false;
  }

  getRoomInfo() {
    return {
      roomId: this.id,
      hostId: this.hostId,
      gameMode: this.gameMode,
      isGameStarted: this.isGameStarted,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
      players: Array.from(this.players.values())
    };
  }
}

// Generate a short, readable room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Ensure unique room code
function generateUniqueRoomCode() {
  let code;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));
  return code;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Player connected: ${socket.id}`);

  // Register player
  socket.on('register_player', (data) => {
    players.set(socket.id, {
      id: socket.id,
      name: data.name || 'Player',
      originalName: data.name || 'Player', // Keep track of original name
      roomId: null,
      connectedAt: new Date()
    });

    console.log(`👤 Player registered: ${data.name} (${socket.id})`);
  });

  // Create room
  socket.on('create_room', (data) => {
    try {
      const roomId = generateUniqueRoomCode();
      const player = players.get(socket.id);

      if (!player) {
        socket.emit('error', 'Player not registered');
        return;
      }

      const room = new GameRoom(roomId, socket.id, player.name, data.gameMode);
      rooms.set(roomId, room);

      // Join socket room
      socket.join(roomId);
      player.roomId = roomId;

      console.log(`🏠 Room created: ${roomId} by ${player.name} (${data.gameMode})`);

      socket.emit('room_created', room.getRoomInfo());
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', 'Failed to create room');
    }
  });

  // Join room
  socket.on('join_room', (data) => {
    try {
      const { roomId, playerName } = data;
      const room = rooms.get(roomId);
      const player = players.get(socket.id);

      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }

      if (!player) {
        socket.emit('error', 'Player not registered');
        return;
      }

      if (room.isGameStarted) {
        socket.emit('error', 'Game already in progress');
        return;
      }

      const added = room.addPlayer(socket.id, playerName || player.name);
      if (!added) {
        socket.emit('error', 'Room is full');
        return;
      }

      // Join socket room
      socket.join(roomId);
      player.roomId = roomId;
      
      // Use the provided playerName if different, but keep original for logging
      const actualPlayerName = playerName || player.originalName || player.name;
      player.name = actualPlayerName;

      console.log(`🚪 Player ${actualPlayerName} joined room ${roomId} as player 2 (joiner)`);

      // Update the player in the room with the correct name
      room.players.set(socket.id, {
        id: socket.id,
        name: actualPlayerName,
        isReady: false,
        joinedAt: new Date()
      });

      // Send initial game config to both players
      const playersArray = Array.from(room.players.values());
      const gameConfig = {
        players: playersArray.map((p, index) => ({
          ...p,
          playerIndex: index, // Host = 0, Joiner = 1
          isHost: p.id === room.hostId
        })),
        gameMode: room.gameMode,
        roomId: room.id
      };

      // Notify joining player with their assigned position
      socket.emit('room_joined', {
        ...room.getRoomInfo(),
        gameConfig,
        yourPlayerIndex: playersArray.findIndex(p => p.id === socket.id)
      });

      // Notify other players in room
      socket.to(roomId).emit('player_joined', {
        id: socket.id,
        name: player.name,
        playerIndex: playersArray.length - 1 // Always the last index (joiner)
      });

      // Send updated room state to everyone with game config
      io.to(roomId).emit('room_updated', {
        ...room.getRoomInfo(),
        gameConfig
      });

      // If room is full, automatically prepare game start
      if (room.players.size >= 2) {
        console.log(`🎮 Room ${roomId} ready to start - Host: ${playersArray[0].name}, Joiner: ${playersArray[1].name}`);
        
        // Send game ready signal to both players
        io.to(roomId).emit('game_ready', {
          hostPlayer: { ...playersArray[0], playerIndex: 0 },
          joinerPlayer: { ...playersArray[1], playerIndex: 1 },
          gameMode: room.gameMode
        });
      }

    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', 'Failed to join room');
    }
  });

  // Leave room
  socket.on('leave_room', (data) => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;

    leaveRoom(socket, player.roomId);
  });

  // Start game (host only)
  socket.on('start_game', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player || !player.roomId) {
        socket.emit('error', 'Not in a room');
        return;
      }

      const room = rooms.get(player.roomId);
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }

      if (room.hostId !== socket.id) {
        socket.emit('error', 'Only host can start the game');
        return;
      }

      if (!room.canStartGame()) {
        socket.emit('error', 'Cannot start game - need at least 2 players');
        return;
      }

      const started = room.startGame();
      if (started) {
        const playersArray = Array.from(room.players.values());
        console.log(`🎮 Game started in room ${room.id} - Host: ${playersArray[0].name} (Player 0), Joiner: ${playersArray[1].name} (Player 1)`);
        
        // Send game start with proper player assignments
        io.to(room.id).emit('game_started', {
          players: playersArray.map((p, index) => ({
            ...p,
            playerIndex: index,
            isHost: p.id === room.hostId
          })),
          gameState: room.gameState
        });
        
        io.to(room.id).emit('room_updated', room.getRoomInfo());
      }

    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', 'Failed to start game');
    }
  });

  // Game state updates (backend managed)
  socket.on('game_state', (data) => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;

    const room = rooms.get(player.roomId);
    if (!room || !room.isGameStarted) return;

    // Handle special game events that can come from any player
    if (data.gameEnd) {
      // Game end can be broadcast by host
      if (room.hostId === socket.id) {
        console.log(`🏆 Game ended in room ${player.roomId}: ${data.winnerName} wins!`);
        io.to(player.roomId).emit('game_state', data);
      }
      return;
    }

    if (data.pauseToggle !== undefined) {
      // Pause can be toggled by any player
      const playerName = player.name || 'Unknown';
      console.log(`⏸️ Game pause toggled by ${playerName} in room ${player.roomId}: ${data.isPaused ? 'paused' : 'resumed'}`);
      
      // Update room pause state
      room.isPaused = data.isPaused;
      room.pausedBy = playerName;
      
      // Broadcast pause state to all players in the room
      io.to(player.roomId).emit('game_state', {
        pauseToggle: true,
        isPaused: data.isPaused,
        pausedBy: playerName
      });
      return;
    }

    // If this is from the host, update the authoritative game state
    if (room.hostId === socket.id) {
      // Ensure joiner always gets second score position
      if (data.state && data.state.scores) {
        const playersArray = Array.from(room.players.values());
        const hostScore = data.state.scores[0] || 0;
        const joinerScore = data.state.scores[1] || 0;
        
        // Maintain proper score assignment: index 0 = host, index 1 = joiner
        room.gameState = {
          ...data.state,
          scores: [hostScore, joinerScore],
          playerAssignment: {
            0: playersArray[0].id, // Host
            1: playersArray[1].id  // Joiner
          },
          lastUpdate: Date.now()
        };
      } else {
        room.gameState = { ...data.state, lastUpdate: Date.now() };
      }

      // Broadcast the authoritative state to joiner only (host already has it)
      socket.to(player.roomId).emit('game_state', room.gameState);
      
      // Debug log to check what's being sent
      console.log(`📡 Broadcasting game state to room ${player.roomId}:`, {
        ball: room.gameState.ball,
        paddleCount: room.gameState.paddles?.length,
        obstacleCount: room.gameState.obstacles?.length,
        scores: room.gameState.scores
      });
    }
  });

  // Player input
  socket.on('player_input', (data) => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;

    const room = rooms.get(player.roomId);
    if (!room || !room.isGameStarted) return;

    const playersArray = Array.from(room.players.values());
    
    // Determine player index based on position in room
    let playerIndex = -1;
    if (socket.id === room.hostId) {
      playerIndex = 0; // Host is always player 0
    } else {
      // Find joiner index (should be 1 for 2P games)
      const joinerIndex = playersArray.findIndex(p => p.id === socket.id);
      if (joinerIndex > 0) {
        playerIndex = joinerIndex; // Joiner gets index 1 (second score)
      }
    }

    if (playerIndex >= 0) {
      // Forward input with correct player index to host for processing
      if (room.hostId !== socket.id) {
        io.to(room.hostId).emit('player_input', {
          playerId: socket.id,
          playerIndex: playerIndex,
          input: data.input
        });
      }
      
      // Also broadcast to other players for immediate visual feedback
      socket.to(player.roomId).emit('player_input', {
        playerId: socket.id,
        playerIndex: playerIndex,
        input: data.input
      });
    }
  });

  // Chat messages
  socket.on('chat_message', (data) => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;

    const message = {
      id: uuidv4(),
      playerId: socket.id,
      playerName: player.name,
      message: data.message,
      timestamp: Date.now(),
      type: 'message'
    };

    // Broadcast to all players in room
    io.to(player.roomId).emit('chat_message', message);
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Player disconnected: ${socket.id} (${reason})`);

    const player = players.get(socket.id);
    if (player && player.roomId) {
      leaveRoom(socket, player.roomId);
    }

    players.delete(socket.id);
  });

  // Helper function to handle leaving a room
  function leaveRoom(socket, roomId) {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = players.get(socket.id);
    const removed = room.removePlayer(socket.id);

    if (removed && player) {
      console.log(`👋 Player ${player.name} left room ${roomId}`);

      // Leave socket room
      socket.leave(roomId);
      player.roomId = null;

      // Notify other players
      socket.to(roomId).emit('player_left', socket.id);

      // If room is empty, delete it
      if (room.getPlayerCount() === 0) {
        rooms.delete(roomId);
        console.log(`🗑️ Room ${roomId} deleted (empty)`);
      } else {
        // Send updated room state
        io.to(roomId).emit('room_updated', room.getRoomInfo());
      }
    }
  }
});

// Server startup
const PORT = process.env.PORT || 3020;

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 FT Transcendence multiplayer server running on port ${PORT}`);
    console.log(`📊 Health check available at: http://localhost:${PORT}/health`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

// Cleanup old empty rooms periodically
setInterval(() => {
  const now = new Date();
  let cleanedUp = 0;

  for (const [roomId, room] of rooms.entries()) {
    // Remove rooms that are empty for more than 5 minutes
    if (room.getPlayerCount() === 0) {
      const ageMinutes = (now - room.createdAt) / (1000 * 60);
      if (ageMinutes > 5) {
        rooms.delete(roomId);
        cleanedUp++;
      }
    }
  }

  if (cleanedUp > 0) {
    console.log(`🧹 Cleaned up ${cleanedUp} old rooms`);
  }
}, 5 * 60 * 1000); // Every 5 minutes

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');

  // Notify all connected clients
  io.emit('server_shutdown', 'Server is shutting down');

  // Close server
  try {
    await fastify.close();
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

module.exports = { fastify, io };
