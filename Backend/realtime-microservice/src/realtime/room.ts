import type { GameState } from './types.js';

export class GameRoom {
  id: string;
  hostId: string;
  gameMode: '2p' | '4p';
  maxPlayers: number;
  players: Map<string, { id: string; name: string; isReady: boolean; joinedAt: number }>;
  isGameStarted: boolean;
  gameState: GameState | null;
  createdAt: number;
  isPaused?: boolean;
  pausedBy?: string;

  constructor(id: string, hostId: string, hostName: string, gameMode: '2p' | '4p' = '2p') {
    this.id = id;
    this.hostId = hostId;
    this.gameMode = gameMode;
    this.maxPlayers = gameMode === '4p' ? 4 : 2;
    this.players = new Map();
    this.isGameStarted = false;
    this.gameState = null;
    this.createdAt = Date.now();
    this.addPlayer(hostId, hostName);
  }

  addPlayer(playerId: string, playerName: string) {
    if (this.players.size >= this.maxPlayers) return false;
    this.players.set(playerId, {
      id: playerId,
      name: playerName,
      isReady: false,
      joinedAt: Date.now()
    });
    return true;
  }

  removePlayer(playerId: string) {
    const removed = this.players.delete(playerId);

    if (playerId === this.hostId && this.players.size > 0) {
      // reassign host safely
      const newHost = Array.from(this.players.keys())[0];
      if (newHost) {
        this.hostId = newHost;
      }
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
    if (!this.canStartGame()) return false;
    this.isGameStarted = true;
    this.gameState = {
      ball: { x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0 },
      paddles: [
        { x: -15, y: 0, z: 0 }, // host
        { x:  15, y: 0, z: 0 }  // joiner
      ],
      scores: [0, 0],
      lastUpdate: Date.now()
    };
    return true;
  }

  info() {
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
