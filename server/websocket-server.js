/**
 * Pure WebSocket Server (WSS) for FT_PONG Real-time Multiplayer
 * Using Fastify framework with native WebSocket protocol for low-latency gaming
 */

const WebSocket = require('ws');
const https = require('https');
const http = require('http');
const fs = require('fs');
const fastify = require('fastify')({ 
  logger: true,
  trustProxy: true
});

// Register CORS plugin
fastify.register(require('@fastify/cors'), {
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    protocol: 'WebSocket',
    framework: 'Fastify',
    activeRooms: rooms.size,
    activePlayers: players.size
  };
});

// API info endpoint
fastify.get('/api/info', async (request, reply) => {
  return {
    name: 'FT_PONG WebSocket Server',
    version: '1.0.0',
    protocol: 'WebSocket',
    framework: 'Fastify',
    endpoints: {
      health: '/health',
      websocket: USE_HTTPS ? 'wss://localhost:' + PORT : 'ws://localhost:' + PORT
    }
  };
});

// Game state management
const rooms = new Map();
const players = new Map();
const connections = new Map();

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
    this.lastActivity = Date.now();
  }

  addPlayer(playerId, playerData) {
    if (this.players.size >= this.maxPlayers) {
      return false;
    }
    
    this.players.set(playerId, {
      id: playerId,
      name: playerData.name,
      isReady: false,
      joinedAt: Date.now(),
      ping: 0
    });
    
    this.lastActivity = Date.now();
    return true;
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    
    // If host leaves, assign new host
    if (playerId === this.hostId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value;
    }
    
    this.lastActivity = Date.now();
  }

  getInfo() {
    return {
      roomId: this.id,
      hostId: this.hostId,
      players: Array.from(this.players.values()),
      gameMode: this.gameMode,
      isGameStarted: this.isGameStarted,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
      lastActivity: this.lastActivity
    };
  }

  isFull() {
    return this.players.size >= this.maxPlayers;
  }

  isEmpty() {
    return this.players.size === 0;
  }

  updateActivity() {
    this.lastActivity = Date.now();
  }
}

// Utility functions
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generatePlayerId() {
  return 'player_' + Math.random().toString(36).substring(2, 15);
}

function broadcastToRoom(roomId, message, excludePlayerId = null) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.players.forEach((player, playerId) => {
    if (playerId !== excludePlayerId) {
      const ws = connections.get(playerId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  });
  
  room.updateActivity();
}

function sendToPlayer(playerId, message) {
  const ws = connections.get(playerId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Configuration
const PORT = process.env.PORT || 3002;
const USE_HTTPS = process.env.USE_HTTPS === 'true';

// Configure HTTPS if needed
if (USE_HTTPS) {
  try {
    fastify.register(require('@fastify/https-redirect'));
    console.log('🔒 HTTPS/WSS server configured');
  } catch (err) {
    console.log('⚠️ HTTPS configuration failed, using HTTP/WS');
  }
}

// Start Fastify server and create WebSocket server
const start = async () => {
  try {
    // Start Fastify server
    const address = await fastify.listen({ 
      port: PORT, 
      host: '0.0.0.0' 
    });
    
    console.log(`🚀 Fastify server listening on ${address}`);
    
    // Create WebSocket server attached to Fastify's server
    const wss = new WebSocket.Server({ 
      server: fastify.server,
      clientTracking: true,
      perMessageDeflate: {
        zlibDeflateOptions: {
          level: 3
        }
      }
    });
    
    setupWebSocketHandlers(wss);
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// WebSocket handlers setup function
function setupWebSocketHandlers(wss) {

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const playerId = generatePlayerId();
  let currentRoomId = null;
  let playerName = 'Player';
  let lastPingTime = Date.now();

  // Store connection
  connections.set(playerId, ws);
  players.set(playerId, {
    id: playerId,
    name: playerName,
    currentRoom: null,
    connectedAt: Date.now(),
    ip: req.socket.remoteAddress
  });

  console.log(`🔌 WebSocket connected: ${playerId} from ${req.socket.remoteAddress}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    playerId: playerId,
    message: 'Connected to WebSocket server'
  }));

  // Handle messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(ws, playerId, message);
    } catch (error) {
      console.error('Invalid message format:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  // Handle connection close
  ws.on('close', () => {
    console.log(`🔌 WebSocket disconnected: ${playerId}`);
    
    // Leave current room if any
    if (currentRoomId) {
      leaveRoom(playerId, currentRoomId);
    }
    
    // Cleanup
    connections.delete(playerId);
    players.delete(playerId);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${playerId}:`, error);
  });

  // Ping/Pong for connection health
  ws.on('pong', () => {
    const player = players.get(playerId);
    if (player) {
      player.ping = Date.now() - lastPingTime;
    }
  });

  // Message handler
  function handleMessage(ws, playerId, message) {
    const { type, data } = message;

    switch (type) {
      case 'register_player':
        playerName = data.name || 'Player';
        const player = players.get(playerId);
        if (player) {
          player.name = playerName;
        }
        
        ws.send(JSON.stringify({
          type: 'player_registered',
          playerId: playerId,
          name: playerName
        }));
        
        console.log(`👤 Player registered: ${playerName} (${playerId})`);
        break;

      case 'create_room':
        const roomId = generateRoomId();
        const room = new GameRoom(roomId, playerId, data.gameMode);
        
        // Add host to room
        room.addPlayer(playerId, { name: data.playerName || playerName });
        rooms.set(roomId, room);
        currentRoomId = roomId;
        
        // Update player's current room
        const playerData = players.get(playerId);
        if (playerData) {
          playerData.currentRoom = roomId;
        }
        
        console.log(`🏠 WebSocket room created: ${roomId} by ${playerName}`);
        
        ws.send(JSON.stringify({
          type: 'room_created',
          data: room.getInfo()
        }));
        break;

      case 'join_room':
        const targetRoom = rooms.get(data.roomId);
        
        if (!targetRoom) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Room not found'
          }));
          return;
        }
        
        if (targetRoom.isFull()) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Room is full'
          }));
          return;
        }
        
        if (targetRoom.isGameStarted) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Game already started'
          }));
          return;
        }
        
        // Add player to room
        const success = targetRoom.addPlayer(playerId, { name: data.playerName || playerName });
        
        if (!success) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Could not join room'
          }));
          return;
        }
        
        currentRoomId = data.roomId;
        
        // Update player's current room
        const joinPlayerData = players.get(playerId);
        if (joinPlayerData) {
          joinPlayerData.currentRoom = data.roomId;
        }
        
        console.log(`🚪 ${playerName} joined WebSocket room: ${data.roomId}`);
        
        // Notify player they joined
        ws.send(JSON.stringify({
          type: 'room_joined',
          data: targetRoom.getInfo()
        }));
        
        // Notify other players about the new player
        broadcastToRoom(data.roomId, {
          type: 'player_joined',
          data: {
            id: playerId,
            name: playerName
          }
        }, playerId);
        
        // Send updated room info to all players
        broadcastToRoom(data.roomId, {
          type: 'room_updated',
          data: targetRoom.getInfo()
        });
        break;

      case 'leave_room':
        if (currentRoomId) {
          leaveRoom(playerId, currentRoomId);
          currentRoomId = null;
        }
        break;

      case 'start_game':
        const gameRoom = rooms.get(data.roomId);
        if (!gameRoom || gameRoom.hostId !== playerId) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Not authorized to start game'
          }));
          return;
        }
        
        gameRoom.isGameStarted = true;
        console.log(`🎮 WebSocket game started in room: ${data.roomId}`);
        
        // Notify all players
        broadcastToRoom(data.roomId, {
          type: 'game_started',
          data: { roomId: data.roomId }
        });
        break;

      case 'game_state':
        const stateRoom = rooms.get(data.roomId);
        if (!stateRoom || stateRoom.hostId !== playerId) return;
        
        stateRoom.gameState = data.state;
        
        // Broadcast to other players
        broadcastToRoom(data.roomId, {
          type: 'game_state',
          data: data.state
        }, playerId);
        break;

      case 'player_input':
        const inputRoom = rooms.get(data.roomId);
        if (!inputRoom) return;
        
        // Broadcast to all players
        broadcastToRoom(data.roomId, {
          type: 'player_input',
          data: {
            playerId: playerId,
            input: data.input,
            timestamp: Date.now()
          }
        });
        break;

      case 'chat_message':
        const chatRoom = rooms.get(data.roomId);
        if (!chatRoom) return;
        
        const chatMessage = {
          type: 'chat_message',
          data: {
            id: Date.now().toString(),
            playerId: playerId,
            playerName: playerName,
            message: data.message,
            timestamp: Date.now()
          }
        };
        
        // Broadcast to all players in room
        broadcastToRoom(data.roomId, chatMessage);
        
        console.log(`💬 [${data.roomId}] ${playerName}: ${data.message}`);
        break;

      case 'ping':
        lastPingTime = Date.now();
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: lastPingTime
        }));
        break;

      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: `Unknown message type: ${type}`
        }));
        break;
    }
  }

  function leaveRoom(playerId, roomId) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const player = room.players.get(playerId);
    if (player) {
      room.removePlayer(playerId);
      
      // Update player's current room
      const playerData = players.get(playerId);
      if (playerData) {
        playerData.currentRoom = null;
      }
      
      console.log(`👋 ${player.name} left WebSocket room: ${roomId}`);
      
      // Notify other players
      broadcastToRoom(roomId, {
        type: 'player_left',
        data: { playerId: playerId }
      }, playerId);
      
      // Remove empty rooms
      if (room.isEmpty()) {
        rooms.delete(roomId);
        console.log(`🗑️ Empty WebSocket room deleted: ${roomId}`);
      } else {
        // Send updated room info
        broadcastToRoom(roomId, {
          type: 'room_updated',
          data: room.getInfo()
        });
      }
    }
  }
});

// Cleanup and health monitoring
setInterval(() => {
  const now = Date.now();
  
  // Clean up old rooms
  const maxAge = 30 * 60 * 1000; // 30 minutes
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.lastActivity > maxAge && room.isEmpty()) {
      rooms.delete(roomId);
      console.log(`🧹 Cleaned up old WebSocket room: ${roomId}`);
    }
  }
  
  // Ping all connections
  connections.forEach((ws, playerId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      connections.delete(playerId);
      players.delete(playerId);
    }
  });
  
}, 30 * 1000); // Every 30 seconds

// Cleanup and health monitoring
setInterval(() => {
  const now = Date.now();
  
  // Clean up old rooms
  const maxAge = 30 * 60 * 1000; // 30 minutes
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.lastActivity > maxAge && room.isEmpty()) {
      rooms.delete(roomId);
      console.log(`🧹 Cleaned up old WebSocket room: ${roomId}`);
    }
  }
  
  // Ping all connections
  connections.forEach((ws, playerId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      connections.delete(playerId);
      players.delete(playerId);
    }
  });
  
}, 30 * 1000); // Every 30 seconds

} // End of setupWebSocketHandlers function

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down Fastify server gracefully');
  
  // Close all WebSocket connections
  connections.forEach((ws) => {
    ws.close(1001, 'Server shutting down');
  });
  
  try {
    await fastify.close();
    console.log('✅ Fastify server closed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down Fastify server gracefully');
  
  // Close all WebSocket connections
  connections.forEach((ws) => {
    ws.close(1001, 'Server shutting down');
  });
  
  try {
    await fastify.close();
    console.log('✅ Fastify server closed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
});

// Start the server
start().then(() => {
  const protocol = USE_HTTPS ? 'WSS (Secure WebSocket)' : 'WS (WebSocket)';
  console.log(`🎮 FT_PONG ${protocol} Server with Fastify running on port ${PORT}`);
  console.log(`🌐 WebSocket endpoint: ${USE_HTTPS ? 'wss' : 'ws'}://localhost:${PORT}`);
  console.log(`📊 Active rooms: ${rooms.size}, Active players: ${players.size}`);
  console.log(`🔧 Features: Chat, Real-time gameplay, Ping monitoring, Auto cleanup`);
}).catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

module.exports = { fastify, start };