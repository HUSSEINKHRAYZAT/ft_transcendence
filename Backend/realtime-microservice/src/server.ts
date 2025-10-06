import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import cors from '@fastify/cors';

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

type TournamentSize = 4 | 8 | 16;
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
    console.log(`⚠️ Cannot start tournament ${tournament.code} - not enough players`);
    return;
  }

  // Build bracket
  tournament.matches = buildNewTournamentBracket(tournament);
  tournament.status = 'active';
  tournament.currentRound = 1;
  tournament.startedAt = Date.now();

  console.log(`🏆 Tournament ${tournament.code} starting with ${tournament.players.length} players`);

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
        matchNumber: i + 1,
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

  console.log(`🏆 Starting round ${round} - ${roundMatches.length} matches simultaneously`);

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
  console.log(`🏆 Round ${tournament.currentRound} completed in tournament ${tournament.code}`);

  // Advance winners to next round
  const currentRoundMatches = tournament.matches.filter(
    (m: any) => m.round === tournament.currentRound && m.status === 'completed'
  );

  const nextRound = tournament.currentRound + 1;
  const nextRoundMatches = tournament.matches.filter(
    (m: any) => m.round === nextRound
  );

  // Fill next round matches with winners
  for (let i = 0; i < currentRoundMatches.length; i++) {
    const completedMatch = currentRoundMatches[i];
    const winner = tournament.players.find(
      (p: any) => p.id === completedMatch.winnerId
    );

    const nextMatchIndex = Math.floor(i / 2);
    const nextMatch = nextRoundMatches[nextMatchIndex];

    if (winner && nextMatch) {
      if (i % 2 === 0) {
        nextMatch.player1 = winner;
      } else {
        nextMatch.player2 = winner;
      }
    }
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

  // Check if tournament is complete
  if (nextRoundMatches.length === 0 || nextRoundMatches.every((m: any) => m.status === 'completed')) {
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

    console.log(`🏆🏆🏆 Tournament ${tournament.code} COMPLETE! Winner: ${finalMatch.winnerId}`);
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
    name: player.name
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
    case 16:
      return 4;
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
  }
}

function activateNextMatchIfAvailable(tournament: TournamentState) {
  // Check if current round is complete
  const currentRoundMatches = tournament.matches.filter(m => m.round === tournament.currentRound);
  const allCurrentRoundComplete = currentRoundMatches.every(m => m.status === 'completed');
  
  if (allCurrentRoundComplete && tournament.currentRound < totalRoundsForSize(tournament.size)) {
    // Move to next round and activate ALL matches in that round
    tournament.currentRound++;
    const nextRoundMatches = tournament.matches.filter(
      m => m.round === tournament.currentRound && m.player1 && m.player2 && m.status === 'pending'
    );
    
    console.log(`🏆 Round ${tournament.currentRound - 1} complete! Starting ${nextRoundMatches.length} matches in round ${tournament.currentRound}`);
    
    nextRoundMatches.forEach(match => {
      activateMatch(tournament, match);
    });
    
    // Broadcast round started event to all players
    broadcastToAll({
      type: 'round_started',
      tournamentId: tournament.id,
      round: tournament.currentRound,
      matches: nextRoundMatches
    });
  }
}

function advanceWinnerToNextRound(tournament: TournamentState, completedMatch: TournamentMatchState, winner: TournamentPlayerInfo) {
  const nextRound = completedMatch.round + 1;
  const maxRound = totalRoundsForSize(tournament.size);

  // If this was the final match, set tournament winner
  if (nextRound > maxRound) {
    tournament.status = 'completed';
    tournament.winner = winner;
    tournament.updatedAt = Date.now();
    console.log(`🏆 Tournament completed! Winner: ${winner.name}`);
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

  // Find the sibling match (the other match feeding into the same next match)
  const siblingMatchIndex = isPlayer1Slot ? completedMatch.matchIndex + 1 : completedMatch.matchIndex - 1;
  const siblingMatch = tournament.matches.find(
    m => m.round === completedMatch.round && m.matchIndex === siblingMatchIndex
  );

  // BEST PRACTICE: Only assign winner to next match if BOTH prerequisite matches are complete
  const isSiblingComplete = siblingMatch ? siblingMatch.status === 'completed' : false;

  // Check if there's already a pending winner from the sibling match
  const pendingPlayer1 = (nextMatch as any).pendingPlayer1;
  const pendingPlayer2 = (nextMatch as any).pendingPlayer2;

  // ENHANCED LOGGING
  console.log(`🔍 DEBUG advanceWinnerToNextRound:`);
  console.log(`   Current match: round ${completedMatch.round}, index ${completedMatch.matchIndex}, winner: ${winner.name}`);
  console.log(`   Next match: round ${nextRound}, index ${targetMatchIndex}, status: ${nextMatch.status}`);
  console.log(`   Sibling match index: ${siblingMatchIndex}, sibling complete: ${isSiblingComplete}`);
  console.log(`   pendingPlayer1: ${pendingPlayer1?.name || 'none'}, pendingPlayer2: ${pendingPlayer2?.name || 'none'}`);

  // Scenario 1: There's a pending winner from the sibling match that completed first
  if (pendingPlayer1 || pendingPlayer2) {
    // This is the second match completing - combine with pending winner
    console.log(`📋 Combining with pending winner. Current match index: ${completedMatch.matchIndex}, isPlayer1Slot: ${isPlayer1Slot}, pendingPlayer1: ${pendingPlayer1?.name}, pendingPlayer2: ${pendingPlayer2?.name}`);

    // CRITICAL FIX: Match to correct pending field
    // Match 0 (even, isPlayer1Slot=true) stores pendingPlayer1
    // Match 1 (odd, isPlayer1Slot=false) stores pendingPlayer2
    // When combining, use whichever pending exists

    const otherPendingPlayer = pendingPlayer1 || pendingPlayer2;

    if (!otherPendingPlayer) {
      return;
    }

    if (isPlayer1Slot) {
      // Current match fills slot 1, pending player fills slot 2
      nextMatch.player1 = winner;
      nextMatch.player2 = otherPendingPlayer;
    } else {
      // Current match fills slot 2, pending player fills slot 1
      nextMatch.player1 = otherPendingPlayer;
      nextMatch.player2 = winner;
    }

    // Clean up pending fields
    delete (nextMatch as any).pendingPlayer1;
    delete (nextMatch as any).pendingPlayer2;

    // Both players assigned - activate the match
    if (nextMatch.player1 && nextMatch.player2 && nextMatch.status === 'pending') {
      console.log(`🎮 Activating match: ${nextMatch.player1.name} vs ${nextMatch.player2.name}`);
      activateMatch(tournament, nextMatch);
    } else {
      console.error(`❌ Failed to activate match! player1: ${nextMatch.player1?.name}, player2: ${nextMatch.player2?.name}, status: ${nextMatch.status}`);
    }
  } else if (isSiblingComplete && siblingMatch) {
    // Scenario 2: Both matches complete, but this is being called second (no pending winner stored yet)
    // This happens when sibling completed but didn't store pending (shouldn't happen with current logic)
    const siblingWinner = tournament.players.find(p => p.id === siblingMatch.winnerId);

    if (isPlayer1Slot) {
      nextMatch.player1 = winner;
      if (siblingWinner) nextMatch.player2 = siblingWinner;
    } else {
      if (siblingWinner) nextMatch.player1 = siblingWinner;
      nextMatch.player2 = winner;
    }

    // Both players assigned - activate the match
    if (nextMatch.player1 && nextMatch.player2 && nextMatch.status === 'pending') {
      activateMatch(tournament, nextMatch);
    }
  } else {
    // Only one match complete - store winner but don't show in bracket yet

    // Store winner in a temporary field so we can retrieve them later
    // This prevents showing incomplete matchups in the bracket
    if (isPlayer1Slot) {
      (nextMatch as any).pendingPlayer1 = winner;
    } else {
      (nextMatch as any).pendingPlayer2 = winner;
    }
  }

  // IMMEDIATE BRACKET UPDATE: Broadcast tournament state after winner advancement
  // This ensures all players see the bracket update in real-time
  tournament.updatedAt = Date.now();
  broadcastTournamentState(tournament);
  console.log(`📡 Broadcasted tournament update to all players after match ${completedMatch.matchIndex} completion`);
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
      console.log(`👤 Player registered: ${name} (${playerId})${externalId ? ` ext:${externalId}` : ''}`);
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

    // ==================== NEW TOURNAMENT SYSTEM ====================
    
    case 'create_new_tournament': {
      const player = players.get(playerId);
      if (!player) {
        sendToSocket(ws, { type: 'tournament_error', reason: 'player_not_registered' });
        break;
      }

      const sizeValue = Number(msg.size);
      const size: TournamentSize = sizeValue === 16 ? 16 : sizeValue === 8 ? 8 : 4;
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
          console.log(`⏰ Auto-starting tournament ${code} after ${autoStartMinutes} minutes`);
          handleTournamentStart(tournamentId);
        }
      }, autoStartMinutes * 60 * 1000);

      sendToSocket(ws, { 
        type: 'tournament_created', 
        tournament 
      });
      
      console.log(`🏆 NEW Tournament created: ${code} (${size} players) by ${player.name}`);
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
        
        console.log(`🏆 ${player.name} joined tournament ${code} (${tournament.players.length}/${tournament.size})`);

        // Check if tournament is full - auto-start
        if (tournament.players.length === tournament.size) {
          console.log(`🏆 Tournament ${code} is full - starting automatically!`);
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

      // Mark match as completed
      foundMatch.status = 'completed';
      foundMatch.winnerId = winnerId;
      foundMatch.score = finalScore;
      foundMatch.completedAt = Date.now();

      console.log(`🏆 Match completed: ${matchId}, winner: ${winnerId}`);

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

        console.log(`🏆 ${player.name} left tournament ${(tournament as any).code}`);

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
      const size: TournamentSize = sizeValue === 16 ? 16 : sizeValue === 8 ? 8 : 4;

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
      console.log(`🏆 Tournament created: ${tournamentId} by ${player.name}`);
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
      if (tournament.players.length === tournament.size) {
        console.log(`🏆 Tournament ${tournament.id} is now full (${tournament.size} players) - waiting for host to start`);
      } else {
        console.log(`🏆 ${player.name} joined tournament ${tournament.id} (${tournament.players.length}/${tournament.size})`);
      }
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
      console.log(`🏆 Activating ${firstRoundMatches.length} first-round matches simultaneously`);
      firstRoundMatches.forEach(match => {
        activateMatch(tournament, match);
      });

      broadcastTournamentState(tournament);
      sendToSocket(ws, { type: 'tournament_started', tournament });
      console.log(`🏆 Tournament manually started: ${tournament.id}`);
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

      console.log(`🏆 Tournament room ${msg.roomId} announced to ${opponentExternalId} by ${player.name}`);
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
      console.log(`✅ Player ${player.name} marked ready for match ${matchId}. Ready: ${match.readyPlayers.size}/2`);

      // Check if both players are ready
      const player1Id = match.player1?.externalId || match.player1?.id;
      const player2Id = match.player2?.externalId || match.player2?.id;

      if (player1Id && player2Id && 
          match.readyPlayers.has(player1Id) && 
          match.readyPlayers.has(player2Id)) {
        
        console.log(`🎮 Both players ready for match ${matchId}! Starting match...`);
        
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
        }
        if (player2Socket && player2Socket.readyState === WebSocket.OPEN) {
          sendToSocket(player2Socket, readyPayload);
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

      if (winnerPlayer) {
        advanceWinnerToNextRound(tournament, match, winnerPlayer);
      }

      tournament.updatedAt = Date.now();

      if (tournament.status !== 'completed') {
        activateNextMatchIfAvailable(tournament);
      }

      broadcastTournamentState(tournament);
      sendToSocket(ws, { type: 'tournament_ack', message: 'match_completed', tournamentId, matchId });

      if (tournament.status === 'completed' && tournament.winner) {
        broadcastTournamentState(tournament);
        console.log(`🏆 Tournament completed: ${tournament.id} - Winner ${tournament.winner.name}`);
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
          console.log(`🗑️ Cleared tournament: ${tournament.id} (${reason})`);
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

      console.log(`🗑️ Cleared ${clearedCount} inactive tournaments`);
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