import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import cors from '@fastify/cors';
import { getHttpsConfig } from './utils/https-config';

declare const process: any;

// Types
interface Player {
  id: string;
  name: string;
  originalName: string;
  roomId: string | null;
  connectedAt: number;
  externalId?: string;
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

type TournamentSize = 4 | 8;
type TournamentStatus = 'waiting' | 'active' | 'completed';
type MatchStatus = 'pending' | 'active' | 'completed';

interface TournamentPlayerInfo {
  id: string;
  name: string;
  externalId?: string;
  isAI?: boolean;
  aiLevel?: 'easy' | 'medium' | 'hard';
}

interface TournamentMatchState {
  id: string;
  round: number;
  matchIndex: number;
  player1?: TournamentPlayerInfo;
  player2?: TournamentPlayerInfo;
  status: MatchStatus;
  winnerId?: string;
  score1?: number;
  score2?: number;
  startedAt?: number;
  completedAt?: number;
  readyPlayers?: Set<string>;
  waitingForOpponent?: boolean;
}

interface TournamentState {
  id: string;
  name: string;
  size: TournamentSize;
  status: TournamentStatus;
  players: TournamentPlayerInfo[];
  matches: TournamentMatchState[];
  currentRound: number;
  createdAt: number;
  updatedAt: number;
  createdBy: {
    id: string;
    name: string;
  };
  isPublic: boolean;
  allowSpectators: boolean;
  winner?: TournamentPlayerInfo;
}

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
const clientMap = new Map<string, WebSocket>(); // For tournament system
const externalIdToPlayerId = new Map<string, string>();
const tournaments = new Map<string, TournamentState>();

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

function generateTournamentId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let id = '';
  for (let i = 0; i < 5; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// ==================== NEW TOURNAMENT SYSTEM HELPERS ====================

function generateTournamentCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function broadcastToAll(payload: any): void {
  for (const ws of sockets.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }
}

function handleTournamentStart(tournamentId: string): void {
  const tournament: any = tournaments.get(tournamentId);
  if (!tournament) return;

  if (tournament.status !== 'waiting') return;

  if (tournament.players.length < 2) {
    return;
  }

  if (tournament.players.length < tournament.size) {
    return;
  }

  // Build bracket
  tournament.matches = buildNewTournamentBracket(tournament);
  tournament.status = 'active';
  tournament.currentRound = 1;
  tournament.startedAt = Date.now();


  // Broadcast tournament started
  broadcastToAll({
    type: 'tournament_started',
    tournament,
    tournamentId: tournament.id
  });

  // Start first round (all matches simultaneously)
  startRoundMatches(tournament, 1);
}

function buildNewTournamentBracket(tournament: any): any[] {
  const matches: any[] = [];
  let matchIdCounter = 1;

  // Shuffle players for random seeding
  const shuffledPlayers = shuffleArray([...tournament.players]);

  // Calculate total rounds needed
  const totalRounds = Math.ceil(Math.log2(tournament.size));

  // Build bracket structure
  let playersInRound = [...shuffledPlayers];
  
  for (let round = 1; round <= totalRounds; round++) {
    const matchesInRound = Math.ceil(playersInRound.length / 2);

    for (let i = 0; i < matchesInRound; i++) {
      const player1 = playersInRound[i * 2];
      const player2 = playersInRound[i * 2 + 1];

      matches.push({
        id: `match-${matchIdCounter++}`,
        round,
        matchIndex: i,
        player1: player1 || null,
        player2: player2 || null,
        status: 'pending',
        score: { player1: 0, player2: 0 },
        maxGoals: tournament.maxGoals
      });
    }

    // Prepare next round (winners will fill these slots)
    playersInRound = new Array(matchesInRound).fill(null);
  }

  return matches;
}

function startRoundMatches(tournament: any, round: number): void {
  const roundMatches = tournament.matches.filter(
    (m: any) => m.round === round && m.status === 'pending' && m.player1 && m.player2
  );


  // Activate all matches in the round
  for (const match of roundMatches) {
    match.status = 'active';
    match.startedAt = Date.now();

    // Notify both players
    broadcastToAll({
      type: 'match_ready',
      tournament,
      match
    });
  }

  // Broadcast round started
  broadcastToAll({
    type: 'round_started',
    tournament,
    round
  });
}

function handleRoundCompletion(tournament: any): void {

  // Advance winners to next round
  const currentRoundMatches = tournament.matches.filter(
    (m: any) => m.round === tournament.currentRound && m.status === 'completed'
  );

  const nextRound = tournament.currentRound + 1;
  const nextRoundMatches = tournament.matches.filter(
    (m: any) => m.round === nextRound
  );

  // Fill next round matches with winners - FIXED: Only assign once per winner
  // Sort current round matches by matchIndex to ensure consistent ordering
  const sortedMatches = currentRoundMatches.sort((a: any, b: any) => a.matchIndex - b.matchIndex);
  
  
  for (let i = 0; i < sortedMatches.length; i++) {
    const completedMatch = sortedMatches[i];
    const winner = tournament.players.find(
      (p: any) => p.id === completedMatch.winnerId
    );

    if (!winner) {
      console.warn(`⚠️ No winner found for match ${completedMatch.id} (winnerId: ${completedMatch.winnerId})`);
      continue;
    }

    const nextMatchIndex = Math.floor(i / 2);
    const nextMatch = nextRoundMatches[nextMatchIndex];

    if (!nextMatch) {
      console.warn(`⚠️ No next round match found at index ${nextMatchIndex}`);
      continue;
    }

    // Assign winner to next match based on their position
    // i=0,1 -> match 0; i=2,3 -> match 1; etc.
    if (i % 2 === 0) {
      // First match of pair -> player1 of next match
      if (!nextMatch.player1) {
        nextMatch.player1 = { ...winner };
      } else if (nextMatch.player1.id !== winner.id) {
        console.warn(`⚠️ Slot 1 already occupied by ${nextMatch.player1.name}, cannot assign ${winner.name}`);
      } 
    } else {
      // Second match of pair -> player2 of next match
      if (!nextMatch.player2) {
        nextMatch.player2 = { ...winner };
      } else if (nextMatch.player2.id !== winner.id) {
        console.warn(`⚠️ Slot 2 already occupied by ${nextMatch.player2.name}, cannot assign ${winner.name}`);
      } 
    }

    const hasPlayer1 = Boolean(nextMatch.player1);
    const hasPlayer2 = Boolean(nextMatch.player2);
    nextMatch.waitingForOpponent = !(hasPlayer1 && hasPlayer2);

    if (nextMatch.status === 'completed') {
      nextMatch.status = 'pending';
      delete nextMatch.completedAt;
    }

    if (nextMatch.readyPlayers && nextMatch.readyPlayers instanceof Set) {
      nextMatch.readyPlayers.clear();
    }

    delete nextMatch.startedAt;

  }

  // Notify losers (eliminated)
  for (const match of currentRoundMatches) {
    const loserId = match.player1.id === match.winnerId ? match.player2.id : match.player1.id;
    const loser = tournament.players.find((p: any) => p.id === loserId);

    if (loser) {
      broadcastToAll({
        type: 'player_eliminated',
        tournament,
        player: loser,
        message: 'You have been eliminated from the tournament'
      });
    }
  }

  // Push updated bracket state so clients see newly assigned players immediately
  broadcastTournamentState(tournament);

  // Check if tournament is complete
  // Tournament is complete only when:
  // 1. There are no next round matches (shouldn't happen with proper bracket)
  // 2. OR we just completed the final round (only 1 match in current round)
  const isFinalRound = currentRoundMatches.length === 1;
  
  if (nextRoundMatches.length === 0 || isFinalRound) {
    // Tournament complete!
    const finalMatch = currentRoundMatches[0];
    tournament.status = 'completed';
    tournament.winnerId = finalMatch.winnerId;
    tournament.completedAt = Date.now();

    broadcastToAll({
      type: 'tournament_completed',
      tournament,
      winner: tournament.players.find((p: any) => p.id === finalMatch.winnerId)
    });

  } else {
    // Start next round
    tournament.currentRound = nextRound;

    broadcastToAll({
      type: 'round_completed',
      tournament,
      completedRound: tournament.currentRound - 1
    });

    // Small delay before starting next round
    setTimeout(() => {
      startRoundMatches(tournament, nextRound);
    }, 3000);
  }
}

// ==================== END NEW TOURNAMENT SYSTEM HELPERS ====================

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = arr[i];
    const b = arr[j];
    if (a === undefined || b === undefined) {
      continue;
    }
    arr[i] = b;
    arr[j] = a;
  }
  return arr;
}

function sendTournamentSnapshotToPlayer(playerId: string): void {
  const ws = sockets.get(playerId);
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  // Filter tournaments to only include those with at least one online player
  const filteredTournaments = Array.from(tournaments.values()).filter(tournament => {
    // Always show if any player is online or if tournament has AI players
    return tournament.players.some(player => {
      // AI players are always "online"
      if (player.isAI) return true;
      
      // Check if human player is connected via externalId
      if (player.externalId) {
        const pid = externalIdToPlayerId.get(player.externalId);
        if (pid && sockets.has(pid)) {
          const playerWs = sockets.get(pid);
          return playerWs && playerWs.readyState === WebSocket.OPEN;
        }
      }
      
      // Check by player.id directly
      const playerWs = sockets.get(player.id);
      return playerWs && playerWs.readyState === WebSocket.OPEN;
    });
  });

  const snapshot = filteredTournaments.map(t => ({ ...t }));
  sendToSocket(ws, {
    type: 'tournament_snapshot',
    tournaments: snapshot
  });
}

function broadcastTournamentState(tournament: TournamentState, excludePlayerId?: string) {
  const payload = {
    type: 'tournament_update',
    tournament: { ...tournament }
  };

  for (const [pid, ws] of sockets.entries()) {
    if (pid === excludePlayerId) continue;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }
}

function sendToExternalId(externalId: string, payload: WSMessage) {
  const playerId = externalIdToPlayerId.get(externalId);
  if (!playerId) return;
  const ws = sockets.get(playerId);
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  sendToSocket(ws, payload);
}

function makePlayerInfo(player: Player): TournamentPlayerInfo {
  const info: TournamentPlayerInfo = {
    id: player.externalId || player.id,
    name: player.name,
    isAI: false  // ← Explicitly mark human players as NOT AI
  };

  if (player.externalId) {
    info.externalId = player.externalId;
  }

  return info;
}

// AI Players removed - tournaments are now human-only

function totalRoundsForSize(size: TournamentSize): number {
  switch (size) {
    case 4:
      return 2;
    case 8:
      return 3;
    default:
      return 2;
  }
}

function buildTournamentMatches(tournament: TournamentState): TournamentMatchState[] {
  const matches: TournamentMatchState[] = [];
  const shuffledPlayers = shuffleArray(tournament.players);
  const firstRoundMatches = tournament.size / 2;

  for (let i = 0; i < firstRoundMatches; i++) {
    const player1 = shuffledPlayers[i * 2];
    const player2 = shuffledPlayers[i * 2 + 1];

    const match: TournamentMatchState = {
      id: `${tournament.id}-r1-m${i}`,
      round: 1,
      matchIndex: i,
      status: 'pending'
    };

    if (player1) {
      match.player1 = player1;
    }

    if (player2) {
      match.player2 = player2;
    }

    matches.push(match);
  }

  const totalRounds = totalRoundsForSize(tournament.size);
  for (let round = 2; round <= totalRounds; round++) {
    const count = Math.pow(2, totalRounds - round);
    for (let matchIndex = 0; matchIndex < count; matchIndex++) {
      matches.push({
        id: `${tournament.id}-r${round}-m${matchIndex}`,
        round,
        matchIndex,
        status: 'pending'
      });
    }
  }

  return matches;
}

function activateMatch(tournament: TournamentState, match: TournamentMatchState) {


  match.status = 'active';
  match.startedAt = Date.now();
  tournament.currentRound = match.round;

  if (match.player1 && match.player2) {

    sendToExternalId(match.player1.externalId || match.player1.id, {
      type: 'tournament_match_ready',
      tournamentId: tournament.id,
      matchId: match.id,
      role: 'host',
      match
    });

    sendToExternalId(match.player2.externalId || match.player2.id, {
      type: 'tournament_match_ready',
      tournamentId: tournament.id,
      matchId: match.id,
      role: 'guest',
      match
    });

  } else {
    console.warn(`⚠️ Cannot activate match ${match.id} - missing players: p1=${match.player1?.name || 'null'}, p2=${match.player2?.name || 'null'}`);
  }
}

function activateNextMatchIfAvailable(tournament: TournamentState) {
  const currentRound = tournament.currentRound;
  const totalRounds = totalRoundsForSize(tournament.size);
  const currentRoundMatches = tournament.matches.filter(m => m.round === currentRound);

  if (currentRoundMatches.length === 0) {
    console.warn(`⚠️ activateNextMatchIfAvailable: no matches tracked for currentRound=${currentRound}`);
    return;
  }

  const allCurrentRoundComplete = currentRoundMatches.every(m => m.status === 'completed');



  if (!allCurrentRoundComplete) {
    return;
  }

  if (currentRound >= totalRounds) {


    if (tournament.status !== 'completed') {
      const winningMatch = currentRoundMatches.find(m => m.winnerId);
      if (winningMatch) {
        if (winningMatch.player1 && winningMatch.player1.id === winningMatch.winnerId) {
          tournament.winner = winningMatch.player1;
        } else if (winningMatch.player2 && winningMatch.player2.id === winningMatch.winnerId) {
          tournament.winner = winningMatch.player2;
        }
      }

      tournament.status = 'completed';
      tournament.updatedAt = Date.now();
      broadcastTournamentState(tournament);
    }

    return;
  }

  const nextRound = currentRound + 1;
  const nextRoundMatches = tournament.matches.filter(
    m => m.round === nextRound && m.player1 && m.player2
  );


  if (nextRoundMatches.length === 0) {
    console.warn(`⚠️ No fully assigned matches ready to activate in round ${nextRound}. Pending matches:`,
      tournament.matches.filter(m => m.round === nextRound).map(m => ({
        id: m.id,
        player1: m.player1?.name || 'null',
        player2: m.player2?.name || 'null',
        status: m.status
      }))
    );
    return;
  }

  tournament.currentRound = nextRound;

  nextRoundMatches.forEach(match => {
    if (match.status === 'pending') {
      activateMatch(tournament, match);
    }
  });

  broadcastTournamentState(tournament);

  broadcastToAll({
    type: 'round_started',
    tournamentId: tournament.id,
    round: nextRound,
    matches: nextRoundMatches
  });
}

function advanceWinnerToNextRound(tournament: TournamentState, completedMatch: TournamentMatchState, winner: TournamentPlayerInfo) {
  const totalRounds = totalRoundsForSize(tournament.size);
  const nextRound = completedMatch.round + 1;
  const winnerClone: TournamentPlayerInfo = { ...winner };

  
  // If this was the final match, set tournament winner
  if (nextRound > totalRounds) {
    tournament.status = 'completed';
  tournament.winner = winnerClone;
  tournament.updatedAt = Date.now();
    broadcastTournamentState(tournament);
    return;
  }

  // Find the next round match this winner should advance to
  const targetMatchIndex = Math.floor(completedMatch.matchIndex / 2);
  
  const nextMatch = tournament.matches.find(m => m.round === nextRound && m.matchIndex === targetMatchIndex);

  if (!nextMatch) {
    console.warn(`⚠️ Could not find next match for round ${nextRound}, index ${targetMatchIndex}`);
    return;
  }

  // Determine which slot (player1 or player2) this winner should occupy
  const isPlayer1Slot = completedMatch.matchIndex % 2 === 0;

  // Clean up legacy pending fields if they exist
  if ((nextMatch as any).pendingPlayer1) {
    delete (nextMatch as any).pendingPlayer1;
  }
  if ((nextMatch as any).pendingPlayer2) {
    delete (nextMatch as any).pendingPlayer2;
  }

  const existingSlotPlayer = isPlayer1Slot ? nextMatch.player1 : nextMatch.player2;

  if (existingSlotPlayer && existingSlotPlayer.id !== winnerClone.id) {
    console.warn(`⚠️ Next match ${nextMatch.id} already has a different player assigned in slot ${isPlayer1Slot ? 'player1' : 'player2'}. Keeping existing assignment.`);
  } else {
    if (isPlayer1Slot) {
      nextMatch.player1 = winnerClone;
    } else {
      nextMatch.player2 = winnerClone;
    }
  }

  const hasPlayer1 = Boolean(nextMatch.player1);
  const hasPlayer2 = Boolean(nextMatch.player2);
  nextMatch.waitingForOpponent = !(hasPlayer1 && hasPlayer2);

  if (nextMatch.status === 'completed') {
    nextMatch.status = 'pending';
    delete nextMatch.completedAt;
  }

  if (nextMatch.readyPlayers && nextMatch.readyPlayers instanceof Set) {
    nextMatch.readyPlayers.clear();
  }

  delete nextMatch.startedAt;


  // Broadcast updated tournament state so brackets update immediately
  tournament.updatedAt = Date.now();
  

  broadcastTournamentState(tournament);
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

    // Update player state
    player.roomId = null;

    // Notify other players
    emitToRoomExcept(roomId, playerId, { type: 'player_left', id: playerId });

    // If room is empty, delete it
    if (room.getPlayerCount() === 0) {
      rooms.delete(roomId);
    } else {
      // Send updated room state
      emitToRoom(roomId, { type: 'room_updated', ...room.getRoomInfo() });
    }
  }
}

function handleDisconnect(playerId: string): void {

  const player = players.get(playerId);
  sockets.delete(playerId);

  if (player?.externalId) {
    externalIdToPlayerId.delete(player.externalId);
  }

  if (player && player.roomId) {
    leaveRoom(playerId, player.roomId);
  }

  players.delete(playerId);

  // Broadcast tournament snapshot to all remaining players
  // This will hide tournaments where this was the last online player
  setTimeout(() => {
    for (const [pid] of sockets.entries()) {
      sendTournamentSnapshotToPlayer(pid);
    }
  }, 100);
}

function handleMessage(playerId: string, ws: WSClient, msg: WSMessage): void {
  switch (msg.type) {
    case 'register_player': {
      const name = (msg.name && String(msg.name).trim()) || 'Player';
      const externalId = msg.externalId ? String(msg.externalId).trim() : undefined;

      if (externalId) {
        const existingPlayerId = externalIdToPlayerId.get(externalId);
        if (existingPlayerId && existingPlayerId !== playerId) {
          externalIdToPlayerId.delete(externalId);
          const existingPlayer = players.get(existingPlayerId);
          if (existingPlayer && 'externalId' in existingPlayer) {
            delete existingPlayer.externalId;
          }
        }
        externalIdToPlayerId.set(externalId, playerId);
      }

      const playerRecord: Player = {
        id: playerId,
        name: name,
        originalName: name,
        roomId: null,
        connectedAt: Date.now()
      };

      if (externalId) {
        playerRecord.externalId = externalId;
      }

      players.set(playerId, playerRecord);
      sendToSocket(ws, { type: 'registered', id: playerId, name, externalId });
      sendTournamentSnapshotToPlayer(playerId);
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
          emitToRoom(player.roomId, { type: 'game_state', gameEnd: true, winnerName: msg.winnerName });
        }
        return;
      }

      if (msg.gameExit) {
        const playerName = player.name || 'Unknown Player';

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

    // ==================== NEW TOURNAMENT SYSTEM ====================
    
    case 'create_new_tournament': {
      const player = players.get(playerId);
      if (!player) {
        sendToSocket(ws, { type: 'tournament_error', reason: 'player_not_registered' });
        break;
      }

      const sizeValue = Number(msg.size);
      const size: TournamentSize = sizeValue === 8 ? 8 : 4;
      const maxGoals = 5; // Always 5 goals
      const autoStartMinutes = Number(msg.autoStartMinutes) || 5;

      // Generate unique 6-character code
      let code = generateTournamentCode();
      while (Array.from(tournaments.values()).some(t => (t as any).code === code)) {
        code = generateTournamentCode();
      }

      let tournamentId = randomUUID();
      
      const now = Date.now();
      const creatorInfo = makePlayerInfo(player);
      const autoStartDeadline = now + (autoStartMinutes * 60 * 1000);

      const tournament: any = {
        id: tournamentId,
        code,
        size,
        maxGoals,
        players: [{
          ...creatorInfo,
          isOnline: true,
          joinedAt: now
        }],
        status: 'waiting',
        matches: [],
        currentRound: 0,
        createdBy: creatorInfo.id,
        createdAt: now,
        autoStartDeadline,
        isPublic: true,
        allowSpectators: true
      };

      tournaments.set(tournamentId, tournament);
      
      // Schedule auto-start
      setTimeout(() => {
        const t = tournaments.get(tournamentId);
        if (t && t.status === 'waiting' && t.players.length >= 2) {
          handleTournamentStart(tournamentId);
        }
      }, autoStartMinutes * 60 * 1000);

      sendToSocket(ws, { 
        type: 'tournament_created', 
        tournament 
      });
      
      break;
    }

    case 'join_new_tournament': {
      const player = players.get(playerId);
      if (!player) {
        sendToSocket(ws, { type: 'tournament_error', reason: 'player_not_registered' });
        break;
      }

      const code = String(msg.code || '').trim().toUpperCase();
      const tournament = Array.from(tournaments.values()).find((t: any) => t.code === code);

      if (!tournament) {
        sendToSocket(ws, { type: 'tournament_error', reason: 'tournament_not_found', code });
        break;
      }

      if (tournament.status !== 'waiting') {
        sendToSocket(ws, { type: 'tournament_error', reason: 'tournament_already_started' });
        break;
      }

      if (tournament.players.length >= tournament.size) {
        sendToSocket(ws, { type: 'tournament_error', reason: 'tournament_full' });
        break;
      }

      const playerInfo: any = {
        ...makePlayerInfo(player),
        isOnline: true,
        joinedAt: Date.now()
      };

      const alreadyJoined = tournament.players.some((p: any) => p.id === playerInfo.id);
      if (!alreadyJoined) {
        tournament.players.push(playerInfo);
        

        // Check if tournament is full - auto-start
        if (tournament.players.length === tournament.size) {
          setTimeout(() => {
            handleTournamentStart(tournament.id);
          }, 2000); // 2 second delay for players to see "FULL" status
        }
      }

      // Broadcast to ALL clients (both player_joined and tournament_updated)
      broadcastToAll({
        type: 'player_joined',
        tournament,
        player: playerInfo
      });

      broadcastToAll({
        type: 'tournament_updated',
        tournament
      });

      break;
    }

    case 'start_new_tournament': {
      const tournamentId = String(msg.tournamentId || '').trim();
      const tournament = tournaments.get(tournamentId);

      if (!tournament) {
        sendToSocket(ws, { type: 'tournament_error', reason: 'tournament_not_found' });
        break;
      }

      if (tournament.status !== 'waiting') {
        sendToSocket(ws, { type: 'tournament_error', reason: 'tournament_already_started' });
        break;
      }

      if (tournament.players.length < tournament.size) {
        sendToSocket(ws, {
          type: 'tournament_error',
          reason: 'tournament_not_full',
          required: tournament.size,
          current: tournament.players.length
        });
        break;
      }

      handleTournamentStart(tournamentId);
      break;
    }

    case 'complete_new_match': {
      const matchId = String(msg.matchId || '').trim();
      const winnerId = String(msg.winnerId || '').trim();
      const finalScore = msg.finalScore || { player1: 0, player2: 0 };

      let foundTournament: any = null;
      let foundMatch: any = null;

      for (const tournament of tournaments.values()) {
        const match = (tournament as any).matches?.find((m: any) => m.id === matchId);
        if (match) {
          foundTournament = tournament;
          foundMatch = match;
          break;
        }
      }

      if (!foundTournament || !foundMatch) {
        sendToSocket(ws, { type: 'tournament_error', reason: 'match_not_found' });
        break;
      }

      if (foundMatch.status === 'completed') {
        break; // Already completed
      }

      // Validate winnerId is one of the players
      const isPlayer1Winner = foundMatch.player1?.id === winnerId;
      const isPlayer2Winner = foundMatch.player2?.id === winnerId;
      
      if (!isPlayer1Winner && !isPlayer2Winner) {
        console.error(`❌ Invalid winnerId ${winnerId} for match ${matchId}. Players: ${foundMatch.player1?.id}, ${foundMatch.player2?.id}`);
        sendToSocket(ws, { type: 'tournament_error', reason: 'invalid_winner' });
        break;
      }

      // Mark match as completed
      foundMatch.status = 'completed';
      foundMatch.winnerId = winnerId;
      foundMatch.score = finalScore;
      foundMatch.completedAt = Date.now();

      const winnerName = isPlayer1Winner ? foundMatch.player1?.name : foundMatch.player2?.name;

      // Broadcast match completion
      broadcastToAll({
        type: 'match_completed',
        tournament: foundTournament,
        match: foundMatch
      });

      // Check if round is complete
      const currentRoundMatches = foundTournament.matches.filter(
        (m: any) => m.round === foundTournament.currentRound
      );
      const completedCount = currentRoundMatches.filter((m: any) => m.status === 'completed').length;
      const totalCount = currentRoundMatches.length;
      
      
      const allRoundMatchesComplete = currentRoundMatches.every(
        (m: any) => m.status === 'completed'
      );

      if (allRoundMatchesComplete) {
        handleRoundCompletion(foundTournament);
      }

      break;
    }

    case 'leave_new_tournament': {
      const player = players.get(playerId);
      const tournamentId = String(msg.tournamentId || '').trim();
      const tournament = tournaments.get(tournamentId);

      if (tournament && player) {
        const playerInfo = makePlayerInfo(player);
        (tournament as any).players = (tournament as any).players.filter(
          (p: any) => p.id !== playerInfo.id
        );


        broadcastToAll({
          type: 'tournament_updated',
          tournament
        });
      }

      break;
    }

    // ==================== OLD TOURNAMENT SYSTEM ====================
    
    // Tournament Events
    case 'request_tournaments': {
      sendTournamentSnapshotToPlayer(playerId);
      break;
    }

    case 'create_tournament': {
      const player = players.get(playerId);
      if (!player) {
        sendToSocket(ws, { type: 'tournament_error', reason: 'player_not_registered' });
        break;
      }

      const name = (msg.name && String(msg.name).trim()) || 'New Tournament';
      const sizeValue = Number(msg.size);
      const size: TournamentSize = sizeValue === 8 ? 8 : 4;

      let tournamentId = generateTournamentId();
      while (tournaments.has(tournamentId)) {
        tournamentId = generateTournamentId();
      }

      const now = Date.now();
      const creatorInfo = makePlayerInfo(player);

      const tournament: TournamentState = {
        id: tournamentId,
        name,
        size,
        status: 'waiting',
        players: [creatorInfo],
        matches: [],
        currentRound: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: { id: creatorInfo.id, name: creatorInfo.name },
        isPublic: Boolean(msg.isPublic ?? true),
        allowSpectators: Boolean(msg.allowSpectators ?? true)
      };

      tournaments.set(tournamentId, tournament);
      broadcastTournamentState(tournament);
      sendToSocket(ws, { type: 'tournament_created', tournament });
      break;
    }

    case 'join_tournament': {
      const player = players.get(playerId);
      if (!player) {
        sendToSocket(ws, { type: 'tournament_error', reason: 'player_not_registered' });
        break;
      }

      const tournamentId = String(msg.tournamentId || '').trim();
      const tournament = tournaments.get(tournamentId);

      if (!tournament) {
        sendToSocket(ws, { type: 'tournament_error', reason: 'tournament_not_found' });
        break;
      }

      if (tournament.status !== 'waiting') {
        sendToSocket(ws, { type: 'tournament_error', reason: 'tournament_already_started' });
        break;
      }

      const playerInfo = makePlayerInfo(player);
      const alreadyJoined = tournament.players.some(p => p.id === playerInfo.id);
      if (!alreadyJoined) {
        tournament.players.push(playerInfo);
        tournament.updatedAt = Date.now();
      }

      // Broadcast updated state
      broadcastTournamentState(tournament);
      sendToSocket(ws, { type: 'tournament_joined', tournament });
      
      // Notify when tournament is full - host must manually start
      break;
    }

    case 'start_tournament': {
      const player = players.get(playerId);
      if (!player) {
        sendToSocket(ws, { type: 'tournament_error', reason: 'player_not_registered' });
        break;
      }

      const tournamentId = String(msg.tournamentId || '').trim();
      const tournament = tournaments.get(tournamentId);

      if (!tournament) {
        sendToSocket(ws, { type: 'tournament_error', reason: 'tournament_not_found' });
        break;
      }

      if (tournament.status !== 'waiting') {
        sendToSocket(ws, { type: 'tournament_error', reason: 'tournament_already_started' });
        break;
      }

      // Validate tournament has enough players
      if (tournament.players.length < tournament.size) {
        sendToSocket(ws, { type: 'tournament_error', reason: 'tournament_not_full' });
        break;
      }

      // No AI players - tournaments only work with real users
      // Manual start requested by host
      
      tournament.matches = buildTournamentMatches(tournament);
      tournament.status = 'active';
      tournament.currentRound = 1;
      tournament.updatedAt = Date.now();

      // Activate ALL first round matches simultaneously
      const firstRoundMatches = tournament.matches.filter(m => m.round === 1 && m.player1 && m.player2);
      firstRoundMatches.forEach(match => {
        activateMatch(tournament, match);
      });

      broadcastTournamentState(tournament);
      sendToSocket(ws, { type: 'tournament_started', tournament });
      break;
    }

    case 'tournament_match_room': {
      const player = players.get(playerId);
      if (!player) {
        sendToSocket(ws, {
          type: 'tournament_match_room_ack',
          status: 'error',
          reason: 'player_not_registered'
        });
        break;
      }

      const opponentExternalId = msg.opponentExternalId ? String(msg.opponentExternalId).trim() : '';
      if (!opponentExternalId) {
        sendToSocket(ws, {
          type: 'tournament_match_room_ack',
          status: 'error',
          reason: 'invalid_opponent'
        });
        break;
      }

      const opponentPlayerId = externalIdToPlayerId.get(opponentExternalId);
      if (!opponentPlayerId) {
        sendToSocket(ws, {
          type: 'tournament_match_room_ack',
          status: 'error',
          reason: 'opponent_offline',
          opponentExternalId
        });
        break;
      }

      const opponentSocket = sockets.get(opponentPlayerId);
      if (!opponentSocket || opponentSocket.readyState !== WebSocket.OPEN) {
        sendToSocket(ws, {
          type: 'tournament_match_room_ack',
          status: 'error',
          reason: 'opponent_unreachable',
          opponentExternalId
        });
        break;
      }

      const hostExternalId = player.externalId || player.id;

      sendToSocket(opponentSocket, {
        type: 'tournament_match_room',
        roomId: msg.roomId,
        tournamentId: msg.tournamentId,
        matchId: msg.matchId,
        match: msg.match,
        hostPlayer: {
          id: hostExternalId,
          name: msg.hostName || player.name
        }
      });

      sendToSocket(ws, {
        type: 'tournament_match_room_ack',
        status: 'sent',
        opponentExternalId,
        deliveredTo: opponentPlayerId
      });

      break;
    }

    case 'mark_player_ready': {
      const tournamentId = String(msg.tournamentId || '').trim();
      const matchId = String(msg.matchId || '').trim();

      const tournament = tournaments.get(tournamentId);
      if (!tournament) {
        sendToSocket(ws, { type: 'tournament_error', reason: 'tournament_not_found' });
        break;
      }

      const match = tournament.matches.find(m => m.id === matchId);
      if (!match) {
        sendToSocket(ws, { type: 'tournament_error', reason: 'match_not_found' });
        break;
      }

      const player = players.get(playerId);
      if (!player) {
        sendToSocket(ws, { type: 'tournament_error', reason: 'player_not_registered' });
        break;
      }

      const playerExternalId = player.externalId || player.id;

      // Initialize ready players set if not exists
      if (!match.readyPlayers) {
        match.readyPlayers = new Set();
      }

      // Mark this player as ready
      match.readyPlayers.add(playerExternalId);

      // Check if both players are ready
      const player1Id = match.player1?.externalId || match.player1?.id;
      const player2Id = match.player2?.externalId || match.player2?.id;

      if (player1Id && player2Id && 
          match.readyPlayers.has(player1Id) && 
          match.readyPlayers.has(player2Id)) {
        
        
        // Clear ready state
        match.readyPlayers.clear();
        
        // Notify both players
        const player1SocketId = externalIdToPlayerId.get(player1Id) || player1Id;
        const player2SocketId = externalIdToPlayerId.get(player2Id) || player2Id;


        const readyPayload = {
          type: 'both_players_ready',
          tournamentId,
          matchId,
          players: [player1Id, player2Id]
        };

        const player1Socket = sockets.get(player1SocketId);
        const player2Socket = sockets.get(player2SocketId);


        if (player1Socket && player1Socket.readyState === WebSocket.OPEN) {
          sendToSocket(player1Socket, readyPayload);
        } else {
          console.warn(`❌ Could not send to player1 (${player1Id}): socket ${player1Socket ? 'not open' : 'not found'}`);
        }
        
        if (player2Socket && player2Socket.readyState === WebSocket.OPEN) {
          sendToSocket(player2Socket, readyPayload);
        } else {
          console.warn(`❌ Could not send to player2 (${player2Id}): socket ${player2Socket ? 'not open' : 'not found'}`);
        }
      }

      break;
    }

    case 'complete_tournament_match': {
      const tournamentId = String(msg.tournamentId || '').trim();
      const matchId = String(msg.matchId || '').trim();
      const winnerId = String(msg.winnerId || '').trim();
      const score1 = Number(msg.score1 ?? 0);
      const score2 = Number(msg.score2 ?? 0);

      const tournament = tournaments.get(tournamentId);
      if (!tournament) {
        sendToSocket(ws, { type: 'tournament_error', reason: 'tournament_not_found' });
        break;
      }

      const match = tournament.matches.find(m => m.id === matchId);
      if (!match) {
        sendToSocket(ws, { type: 'tournament_error', reason: 'match_not_found' });
        break;
      }

      if (match.status === 'completed') {
        sendToSocket(ws, { type: 'tournament_ack', message: 'match_already_completed', tournament: tournamentId, matchId });
        break;
      }

      match.status = 'completed';
      match.completedAt = Date.now();
      match.winnerId = winnerId;
      match.score1 = score1;
      match.score2 = score2;

      let winnerPlayer: TournamentPlayerInfo | undefined;
      
      if (match.player1 && match.player1.id === winnerId) {
        winnerPlayer = match.player1;
      } else if (match.player2 && match.player2.id === winnerId) {
        winnerPlayer = match.player2;
      }

      if (!winnerPlayer) {
        const fallbackWinner = tournament.players.find(p => p.id === winnerId || p.externalId === winnerId);
        if (fallbackWinner) {
          winnerPlayer = { ...fallbackWinner };
          console.warn(`⚠️ Winner ${fallbackWinner.name} (id: ${fallbackWinner.id}, externalId: ${fallbackWinner.externalId}) resolved from tournament roster instead of match payload for ${match.id}`);
        } else {
          console.warn(`⚠️ Unable to resolve winner info for match ${match.id} with winnerId ${winnerId}`);
          console.warn(`⚠️ Tournament players:`, tournament.players.map(p => ({ id: p.id, externalId: p.externalId, name: p.name })));
        }
      }

      
      if (winnerPlayer) {
        advanceWinnerToNextRound(tournament, match, { ...winnerPlayer });
      }

      tournament.updatedAt = Date.now();


      if (tournament.status !== 'completed') {
        activateNextMatchIfAvailable(tournament);
      }



      broadcastTournamentState(tournament);
      sendToSocket(ws, { type: 'tournament_ack', message: 'match_completed', tournamentId, matchId });

      if (tournament.status === 'completed' && tournament.winner) {
        broadcastTournamentState(tournament);
      }

      break;
    }

    case 'clear_inactive_tournaments': {
      const now = Date.now();
      const twoMinutesAgo = now - (2 * 60 * 1000);
      let clearedCount = 0;

      // Find and remove completed, old waiting, or tournaments with no online players
      for (const [id, tournament] of tournaments.entries()) {
        // Check if tournament has at least one online player
        const hasOnlinePlayer = tournament.players.some(player => {
          // AI players are always "online"
          if (player.isAI) return true;
          
          // Check if human player is connected
          if (player.externalId) {
            const pid = externalIdToPlayerId.get(player.externalId);
            if (pid && sockets.has(pid)) {
              const playerWs = sockets.get(pid);
              return playerWs && playerWs.readyState === WebSocket.OPEN;
            }
          }
          
          const playerWs = sockets.get(player.id);
          return playerWs && playerWs.readyState === WebSocket.OPEN;
        });

        const shouldRemove = 
          tournament.status === 'completed' ||
          (tournament.status === 'waiting' && tournament.createdAt < twoMinutesAgo) ||
          !hasOnlinePlayer;

        if (shouldRemove) {
          tournaments.delete(id);
          clearedCount++;
          const reason = !hasOnlinePlayer ? 'no online players' : tournament.status;
        }
      }

      // Send updated snapshot to requester
      sendTournamentSnapshotToPlayer(playerId);
      
      // Broadcast update to all connected players
      for (const [pid] of sockets.entries()) {
        if (pid !== playerId) {
          sendTournamentSnapshotToPlayer(pid);
        }
      }

      break;
    }

    default:
      sendToSocket(ws, { type: 'error', error: `Unknown message type: ${msg.type}` });
  }
}

// Tournament room management
interface TournamentRoom {
  id: string;
  tournamentId: string;
  spectators: Set<string>;
  participants: Set<string>;
  createdAt: number;
}

class TournamentManager {
  private tournamentRooms = new Map<string, TournamentRoom>();
  private clientTournaments = new Map<string, string>(); // clientId -> tournamentId

  createTournamentRoom(tournamentId: string): TournamentRoom {
    const room: TournamentRoom = {
      id: `tournament-${tournamentId}`,
      tournamentId,
      spectators: new Set(),
      participants: new Set(),
      createdAt: Date.now(),
    };
    
    this.tournamentRooms.set(tournamentId, room);
    return room;
  }

  joinTournamentAsSpectator(clientId: string, tournamentId: string): boolean {
    let room = this.tournamentRooms.get(tournamentId);
    if (!room) {
      room = this.createTournamentRoom(tournamentId);
    }
    
    room.spectators.add(clientId);
    this.clientTournaments.set(clientId, tournamentId);
    return true;
  }

  joinTournamentAsParticipant(clientId: string, tournamentId: string): boolean {
    let room = this.tournamentRooms.get(tournamentId);
    if (!room) {
      room = this.createTournamentRoom(tournamentId);
    }
    
    room.participants.add(clientId);
    this.clientTournaments.set(clientId, tournamentId);
    return true;
  }

  leaveTournament(clientId: string): void {
    const tournamentId = this.clientTournaments.get(clientId);
    if (!tournamentId) return;

    const room = this.tournamentRooms.get(tournamentId);
    if (room) {
      room.spectators.delete(clientId);
      room.participants.delete(clientId);
      
      // Clean up empty rooms
      if (room.spectators.size === 0 && room.participants.size === 0) {
        this.tournamentRooms.delete(tournamentId);
      }
    }
    
    this.clientTournaments.delete(clientId);
  }

  broadcastToTournament(tournamentId: string, message: any, excludeClientId?: string): void {
    const room = this.tournamentRooms.get(tournamentId);
    if (!room) return;

    const allClients = new Set([...room.spectators, ...room.participants]);
    
    allClients.forEach(clientId => {
      if (clientId === excludeClientId) return;
      
      const client = clientMap.get(clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  getTournamentRoom(tournamentId: string): TournamentRoom | undefined {
    return this.tournamentRooms.get(tournamentId);
  }

  getAllTournamentRooms(): TournamentRoom[] {
    return Array.from(this.tournamentRooms.values());
  }
}

// Main server function
async function start(): Promise<void> {
  // Initialize Fastify with HTTPS support
  const httpsConfig = getHttpsConfig();
  const app: FastifyInstance = fastify({ 
    logger: true,
    ...(httpsConfig.options && { https: httpsConfig.options })
  });

  // Register CORS plugin
  await app.register(cors, {
    origin: (origin: string | undefined, callback: (err: Error | null, allow: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow localhost, 127.0.0.1, and any local network IP (HTTP or HTTPS)
      const allowedPatterns = [
        /^https?:\/\/localhost:\d+$/,
        /^https?:\/\/127\.0\.0\.1:\d+$/,
        /^https?:\/\/10\.\d+\.\d+\.\d+:\d+$/,
        /^https?:\/\/192\.168\.\d+\.\d+:\d+$/,
        /^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/
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
    const protocol = httpsConfig.enabled ? 'HTTPS' : 'HTTP';


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


      ws.on('message', (raw: any) => {
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

      ws.on('error', (err: any) => {
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


    }, 5 * 60 * 1000); // Every 5 minutes

    // Graceful shutdown
    process.on('SIGINT', async () => {

      // Notify all connected clients
      broadcast({ type: 'server_shutdown', message: 'Server is shutting down' });

      // Close server
      try {
        await app.close();
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
