import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import cors from '@fastify/cors';

// Types
interface Player {
  id: string;
  name: string;
  originalName: string;
  roomId: string | null;
  connectedAt: number;
}

interface GameState {
  ball: { x: number; y: number; z: number; vx: number; vy: number; vz: number };
  paddles: Array<{ x: number; y: number; z: number }>;
  scores: [number, number];
  playerAssignment?: { [key: number]: string };
  lastUpdate: number;
}

interface WSMessage {
  type: string;
  [key: string]: any;
}

type WSClient = WebSocket & { _id?: string };

// Room class to manage game rooms
class GameRoom {
  public id: string;
  public hostId: string;
  public gameMode: '2p' | '4p';
  public maxPlayers: number;
  public players: Map<string, { id: string; name: string; isReady: boolean; joinedAt: number }>;
  public isGameStarted: boolean;
  public gameState: GameState | null;
  public createdAt: number;
  public isPaused: boolean;
  public pausedBy: string | null;

  constructor(id: string, hostId: string, hostName: string, gameMode: '2p' | '4p' = '2p') {
    this.id = id;
    this.hostId = hostId;
    this.gameMode = gameMode;
    this.maxPlayers = gameMode === '4p' ? 4 : 2;
    this.players = new Map();
    this.isGameStarted = false;
    this.gameState = null;
    this.createdAt = Date.now();
    this.isPaused = false;
    this.pausedBy = null;

    // Add host as first player
    this.addPlayer(hostId, hostName);
  }

  addPlayer(playerId: string, playerName: string): boolean {
    if (this.players.size >= this.maxPlayers) {
      return false; // Room is full
    }

    this.players.set(playerId, {
      id: playerId,
      name: playerName,
      isReady: false,
      joinedAt: Date.now()
    });

    return true;
  }

  removePlayer(playerId: string): boolean {
    const removed = this.players.delete(playerId);

    // If host leaves, assign new host
    if (playerId === this.hostId && this.players.size > 0) {
      const newHost = Array.from(this.players.keys())[0];
      if (newHost) {
        this.hostId = newHost;
      }
    }

    return removed;
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  canStartGame(): boolean {
    return this.players.size >= 2 && !this.isGameStarted;
  }

  startGame(): boolean {
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

// Game state storage
const rooms = new Map<string, GameRoom>();
const players = new Map<string, Player>();
const sockets = new Map<string, WSClient>();

// Generate a short, readable room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Ensure unique room code
function generateUniqueRoomCode(): string {
  let code: string;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));
  return code;
}

// WebSocket helper functions
function sendToSocket(ws: WSClient, payload: WSMessage): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function emitToRoom(roomId: string, payload: WSMessage): void {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const playerId of room.players.keys()) {
    const ws = sockets.get(playerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }
}

function emitToRoomExcept(roomId: string, exceptPlayerId: string, payload: WSMessage): void {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const playerId of room.players.keys()) {
    if (playerId === exceptPlayerId) continue;
    const ws = sockets.get(playerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }
}

function broadcast(payload: WSMessage): void {
  for (const ws of sockets.values()) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }
}

// Helper function to handle leaving a room
function leaveRoom(playerId: string, roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  const player = players.get(playerId);
  const removed = room.removePlayer(playerId);

  if (removed && player) {
    console.log(`👋 Player ${player.name} left room ${roomId}`);

    // Update player state
    player.roomId = null;

    // Notify other players
    emitToRoomExcept(roomId, playerId, { type: 'player_left', id: playerId });

    // If room is empty, delete it
    if (room.getPlayerCount() === 0) {
      rooms.delete(roomId);
      console.log(`🗑️ Room ${roomId} deleted (empty)`);
    } else {
      // Send updated room state
      emitToRoom(roomId, { type: 'room_updated', ...room.getRoomInfo() });
    }
  }
}

function handleDisconnect(playerId: string): void {
  console.log(`🔌 Player disconnected: ${playerId}`);

  const player = players.get(playerId);
  sockets.delete(playerId);

  if (player && player.roomId) {
    leaveRoom(playerId, player.roomId);
  }

  players.delete(playerId);
}

function handleMessage(playerId: string, ws: WSClient, msg: WSMessage): void {
  switch (msg.type) {
    case 'register_player': {
      const name = (msg.name && String(msg.name).trim()) || 'Player';
      players.set(playerId, {
        id: playerId,
        name: name,
        originalName: name,
        roomId: null,
        connectedAt: Date.now()
      });
      sendToSocket(ws, { type: 'registered', id: playerId, name });
      console.log(`👤 Player registered: ${name} (${playerId})`);
      break;
    }

    case 'create_room': {
      const player = players.get(playerId);
      if (!player) {
        return sendToSocket(ws, { type: 'error', error: 'Player not registered' });
      }

      const gameMode = (msg.gameMode === '4p' ? '4p' : '2p') as '2p' | '4p';
      const roomId = generateUniqueRoomCode();
      const room = new GameRoom(roomId, playerId, player.name, gameMode);
      rooms.set(roomId, room);
      player.roomId = roomId;

      console.log(`🏠 Room created: ${roomId} by ${player.name} (${gameMode})`);
      sendToSocket(ws, { type: 'room_created', ...room.getRoomInfo() });
      break;
    }

    case 'join_room': {
      const { roomId, playerName } = msg;
      const room = rooms.get(roomId);
      const player = players.get(playerId);

      if (!room) {
        return sendToSocket(ws, { type: 'error', error: 'Room not found' });
      }

      if (!player) {
        return sendToSocket(ws, { type: 'error', error: 'Player not registered' });
      }

      if (room.isGameStarted) {
        return sendToSocket(ws, { type: 'error', error: 'Game already in progress' });
      }

      const displayName = (playerName && String(playerName).trim()) || player.name;
      const added = room.addPlayer(playerId, displayName);
      if (!added) {
        return sendToSocket(ws, { type: 'error', error: 'Room is full' });
      }

      player.roomId = roomId;
      player.name = displayName;

      console.log(`🚪 Player ${displayName} joined room ${roomId} as player 2 (joiner)`);

      const playersArray = Array.from(room.players.values());
      const gameConfig = {
        players: playersArray.map((p, index) => ({
          ...p,
          playerIndex: index,
          isHost: p.id === room.hostId
        })),
        gameMode: room.gameMode,
        roomId: room.id
      };

      // Notify joining player
      sendToSocket(ws, {
        type: 'room_joined',
        ...room.getRoomInfo(),
        gameConfig,
        yourPlayerIndex: playersArray.findIndex(p => p.id === playerId)
      });

      // Notify other players in room
      emitToRoomExcept(roomId, playerId, {
        type: 'player_joined',
        id: playerId,
        name: displayName,
        playerIndex: playersArray.length - 1
      });

      // Send updated room state to everyone
      emitToRoom(roomId, {
        type: 'room_updated',
        ...room.getRoomInfo(),
        gameConfig
      });

      // If room is full, automatically prepare game start
      if (room.players.size >= 2) {
        console.log(`🎮 Room ${roomId} ready to start - Host: ${playersArray[0]?.name}, Joiner: ${playersArray[1]?.name}`);

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
      const player = players.get(playerId);
      if (!player || !player.roomId) return;
      leaveRoom(playerId, player.roomId);
      break;
    }

    case 'start_game': {
      const player = players.get(playerId);
      if (!player || !player.roomId) {
        return sendToSocket(ws, { type: 'error', error: 'Not in a room' });
      }

      const room = rooms.get(player.roomId);
      if (!room) {
        return sendToSocket(ws, { type: 'error', error: 'Room not found' });
      }

      if (room.hostId !== playerId) {
        return sendToSocket(ws, { type: 'error', error: 'Only host can start the game' });
      }

      if (!room.canStartGame()) {
        return sendToSocket(ws, { type: 'error', error: 'Cannot start game - need at least 2 players' });
      }

      const started = room.startGame();
      if (started) {
        const playersArray = Array.from(room.players.values());
        console.log(`🎮 Game started in room ${room.id} - Host: ${playersArray[0]?.name} (Player 0), Joiner: ${playersArray[1]?.name} (Player 1)`);

        emitToRoom(room.id, {
          type: 'game_started',
          players: playersArray.map((p, index) => ({
            ...p,
            playerIndex: index,
            isHost: p.id === room.hostId
          })),
          gameState: room.gameState
        });

        emitToRoom(room.id, { type: 'room_updated', ...room.getRoomInfo() });
      }
      break;
    }

    case 'game_state': {
      const player = players.get(playerId);
      if (!player || !player.roomId) return;

      const room = rooms.get(player.roomId);
      if (!room || !room.isGameStarted) return;

      // Handle special game events
      if (msg.gameEnd) {
        if (room.hostId === playerId) {
          console.log(`🏆 Game ended in room ${player.roomId}: ${msg.winnerName} wins!`);
          emitToRoom(player.roomId, { type: 'game_state', gameEnd: true, winnerName: msg.winnerName });
        }
        return;
      }

      if (msg.gameExit) {
        const playerName = player.name || 'Unknown Player';
        console.log(`🚪 Game exit requested by ${playerName} in room ${player.roomId}`);

        const exitPayload = {
          type: 'game_exit',
          exitedBy: msg.exitedBy || playerName,
          reason: msg.reason || 'Player exited the game',
          finalScores: msg.finalScores || [0, 0],
          timestamp: msg.timestamp || Date.now()
        };

        emitToRoom(player.roomId, exitPayload);
        emitToRoom(player.roomId, { ...exitPayload, type: 'game_state', gameExit: true });
        return;
      }

      if (msg.pauseToggle !== undefined) {
        const playerName = player.name || 'Unknown';
        console.log(`⏸️ Game pause toggled by ${playerName} in room ${player.roomId}: ${msg.isPaused ? 'paused' : 'resumed'}`);

        room.isPaused = msg.isPaused;
        room.pausedBy = playerName;

        emitToRoom(player.roomId, {
          type: 'game_state',
          pauseToggle: true,
          isPaused: msg.isPaused,
          pausedBy: playerName
        });
        return;
      }

      // Authoritative updates from host only
      if (room.hostId === playerId && msg.state) {
        if (msg.state.scores) {
          const playersArray = Array.from(room.players.values());
          const hostScore = msg.state.scores[0] || 0;
          const joinerScore = msg.state.scores[1] || 0;

          room.gameState = {
            ...msg.state,
            scores: [hostScore, joinerScore],
            playerAssignment: {
              0: playersArray[0]?.id,
              1: playersArray[1]?.id
            },
            lastUpdate: Date.now()
          };
        } else {
          room.gameState = { ...msg.state, lastUpdate: Date.now() };
        }

        // Broadcast to everyone except host
        emitToRoomExcept(player.roomId, playerId, {
          type: 'game_state',
          state: room.gameState
        });
      }
      break;
    }

    case 'player_input': {
      const player = players.get(playerId);
      if (!player || !player.roomId) return;

      const room = rooms.get(player.roomId);
      if (!room || !room.isGameStarted) return;

      const playersArray = Array.from(room.players.values());
      let playerIndex = -1;

      if (playerId === room.hostId) {
        playerIndex = 0;
      } else {
        const joinerIndex = playersArray.findIndex(p => p.id === playerId);
        if (joinerIndex > 0) {
          playerIndex = joinerIndex;
        }
      }

      if (playerIndex >= 0) {
        // Forward input to host for processing
        if (room.hostId !== playerId) {
          const hostWs = sockets.get(room.hostId);
          if (hostWs) {
            sendToSocket(hostWs, {
              type: 'player_input',
              playerId: playerId,
              playerIndex: playerIndex,
              input: msg.input
            });
          }
        }

        // Broadcast to other players for immediate feedback
        emitToRoomExcept(player.roomId, playerId, {
          type: 'player_input',
          playerId: playerId,
          playerIndex: playerIndex,
          input: msg.input
        });
      }
      break;
    }

    case 'chat_message': {
      const player = players.get(playerId);
      if (!player || !player.roomId) return;

      const message = {
        type: 'chat_message',
        id: randomUUID(),
        playerId: playerId,
        playerName: player.name,
        message: String(msg.message || ''),
        timestamp: Date.now()
      };

      emitToRoom(player.roomId, message);
      break;
    }

    default:
      sendToSocket(ws, { type: 'error', error: `Unknown message type: ${msg.type}` });
  }
}

// Main server function
async function start(): Promise<void> {
  // Initialize Fastify
  const app: FastifyInstance = fastify({ logger: true });

  // Register CORS plugin
  await app.register(cors, {
    origin: (origin: string | undefined, callback: (err: Error | null, allow: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow localhost, 127.0.0.1, and any local network IP
      const allowedPatterns = [
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
        /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
        /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/
      ];

      const allowed = allowedPatterns.some(pattern => pattern.test(origin));
      callback(null, allowed);
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true
  });

  // Health check endpoint
  app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    return {
      status: 'OK',
      message: 'FT Transcendence WebSocket server is running',
      timestamp: new Date().toISOString(),
      rooms: rooms.size,
      connectedPlayers: players.size
    };
  });

  const PORT = parseInt(process.env.PORT || '3020');

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 FT Transcendence WebSocket server running on port ${PORT}`);
    console.log(`📊 Health check available at: http://localhost:${PORT}/health`);

    // Initialize WebSocket server
    const wss = new WebSocketServer({
      server: app.server,
      maxPayload: 16 * 1024 // 16KB max message size
    });

    wss.on('connection', (ws: WebSocket) => {
      const playerId = randomUUID();
      const wsClient = ws as WSClient;
      wsClient._id = playerId;
      sockets.set(playerId, wsClient);
      console.log(`🔌 Player connected: ${playerId}`);

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as WSMessage;
          handleMessage(playerId, wsClient, msg);
        } catch (error) {
          sendToSocket(wsClient, { type: 'error', error: 'Invalid JSON message' });
        }
      });

      ws.on('close', () => {
        handleDisconnect(playerId);
      });

      ws.on('error', (err) => {
        console.error(`WebSocket error for ${playerId}:`, err);
      });
    });

    // Cleanup old empty rooms periodically
    setInterval(() => {
      const now = Date.now();
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
      broadcast({ type: 'server_shutdown', message: 'Server is shutting down' });

      // Close server
      try {
        await app.close();
        console.log('✅ Server shut down gracefully');
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    });

  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Start the server
start().catch(console.error);