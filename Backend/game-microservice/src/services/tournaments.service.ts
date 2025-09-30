import type { FastifyInstance } from 'fastify';
import { CreateTournamentBodyTS, TournamentTS } from '../schemas/tournaments.schema';

interface TournamentPlayer {
  id: string;
  name: string;
  isOnline: boolean;
  isAI?: boolean;
  avatar?: string;
}

interface TournamentMatch {
  id: string;
  round: number;
  matchIndex: number;
  player1?: TournamentPlayer;
  player2?: TournamentPlayer;
  winner?: TournamentPlayer;
  score1?: number;
  score2?: number;
  isComplete: boolean;
  isActive: boolean;
  nextMatchId?: string;
  scheduledTime?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

interface TournamentBracketData {
  tournamentId: string;
  name: string;
  size: 4 | 8 | 16;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  currentRound: number;
  isComplete: boolean;
  winner?: TournamentPlayer;
  createdAt: Date;
  status: 'waiting' | 'active' | 'completed';
  createdBy: string;
  isPublic: boolean;
  allowSpectators: boolean;
}

export function tournamentsService(app: FastifyInstance) {
  const db = app.db;

  // In-memory tournament storage for now (in production, this should be in a database)
  const tournaments = new Map<string, TournamentBracketData>();

  function generateTournamentId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  function generateAIPlayers(count: number): TournamentPlayer[] {
    const aiNames = [
      'AlphaBot', 'BetaBot', 'GammaBot', 'DeltaBot',
      'EpsilonBot', 'ZetaBot', 'EtaBot', 'ThetaBot',
      'IotaBot', 'KappaBot', 'LambdaBot', 'MuBot',
      'NuBot', 'XiBot', 'OmicronBot', 'PiBot'
    ];

    return Array.from({ length: count }, (_, index) => ({
      id: `ai-bot-${index + 1}`,
      name: aiNames[index] || `Bot${index + 1}`,
      isOnline: true,
      isAI: true,
      avatar: '🤖',
    }));
  }

  function generateInitialBracket(tournamentId: string, size: 4 | 8 | 16, players: TournamentPlayer[]): TournamentMatch[] {
    const matches: TournamentMatch[] = [];
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    
    // Generate first round matches
    const firstRoundMatches = size / 2;
    for (let i = 0; i < firstRoundMatches; i++) {
      const player1 = shuffledPlayers[i * 2];
      const player2 = shuffledPlayers[i * 2 + 1];
      
      matches.push({
        id: `${tournamentId}-round1-match${i}`,
        round: 1,
        matchIndex: i,
        player1,
        player2,
        isComplete: false,
        isActive: i === 0, // First match is active initially
      });
    }
    
    // Generate subsequent rounds (empty for now)
    const totalRounds = size === 16 ? 4 : size === 8 ? 3 : 2;
    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = Math.pow(2, totalRounds - round);
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          id: `${tournamentId}-round${round}-match${i}`,
          round,
          matchIndex: i,
          isComplete: false,
          isActive: false,
        });
      }
    }
    
    return matches;
  }

  function createTournament(input: { name: string; size: 4 | 8 | 16; isPublic: boolean; allowSpectators: boolean; createdBy: string }): string {
    const tournamentId = generateTournamentId();
    
    // Create creator player object
    const creatorPlayer: TournamentPlayer = {
      id: input.createdBy,
      name: `Player_${input.createdBy.substring(0, 6)}`, // We'll update this with real name if available
      isOnline: true,
      isAI: false
    };
    
    const tournament: TournamentBracketData = {
      tournamentId,
      name: input.name,
      size: input.size,
      players: [creatorPlayer], // Creator automatically joins
      matches: [],
      currentRound: 1,
      isComplete: false,
      createdAt: new Date(),
      status: 'waiting',
      createdBy: input.createdBy,
      isPublic: input.isPublic,
      allowSpectators: input.allowSpectators,
    };
    
    tournaments.set(tournamentId, tournament);
    return tournamentId;
  }

  function getAllTournaments(): TournamentBracketData[] {
    return Array.from(tournaments.values());
  }

  function getTournamentById(id: string): TournamentBracketData | null {
    return tournaments.get(id) || null;
  }

  function getTournamentByCode(code: string): TournamentBracketData | null {
    // Since we're using tournamentId as the code, this is the same as getTournamentById
    return tournaments.get(code) || null;
  }

  function joinTournament(tournamentId: string, player: TournamentPlayer): TournamentBracketData {
    const tournament = tournaments.get(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'waiting') {
      throw new Error('Tournament has already started or completed');
    }

    if (tournament.players.length >= tournament.size) {
      throw new Error('Tournament is full');
    }

    // Check if player is already in tournament
    if (tournament.players.find(p => p.id === player.id)) {
      throw new Error('Player is already in this tournament');
    }

    tournament.players.push(player);
    tournaments.set(tournamentId, tournament);
    
    return tournament;
  }

  function fillWithAI(tournamentId: string): TournamentBracketData {
    const tournament = tournaments.get(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'waiting') {
      throw new Error('Tournament has already started or completed');
    }

    const slotsNeeded = tournament.size - tournament.players.length;
    if (slotsNeeded <= 0) {
      throw new Error('Tournament is already full');
    }

    const aiPlayers = generateAIPlayers(slotsNeeded);
    tournament.players.push(...aiPlayers);
    tournaments.set(tournamentId, tournament);
    
    return tournament;
  }

  function startTournament(tournamentId: string): TournamentBracketData {
    const tournament = tournaments.get(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'waiting') {
      throw new Error('Tournament has already started or completed');
    }

    if (tournament.players.length < 2) {
      throw new Error('Need at least 2 players to start tournament');
    }

    // Fill remaining slots with AI if needed
    if (tournament.players.length < tournament.size) {
      const slotsNeeded = tournament.size - tournament.players.length;
      const aiPlayers = generateAIPlayers(slotsNeeded);
      tournament.players.push(...aiPlayers);
    }

    // Generate bracket
    tournament.matches = generateInitialBracket(tournamentId, tournament.size, tournament.players);
    tournament.status = 'active';
    tournaments.set(tournamentId, tournament);
    
    return tournament;
  }

  function startMatch(tournamentId: string, matchId: string): { success: boolean; message: string } {
    const tournament = tournaments.get(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    const match = tournament.matches.find(m => m.id === matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.isComplete) {
      throw new Error('Match is already completed');
    }

    if (!match.player1 || !match.player2) {
      throw new Error('Match does not have both players assigned');
    }

    match.isActive = true;
    match.startedAt = new Date();
    tournaments.set(tournamentId, tournament);
    
    return { success: true, message: 'Match started successfully' };
  }

  function completeMatch(tournamentId: string, matchId: string, winnerId: string, score1: number, score2: number): TournamentBracketData {
    const tournament = tournaments.get(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    const match = tournament.matches.find(m => m.id === matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.isComplete) {
      throw new Error('Match is already completed');
    }

    if (!match.player1 || !match.player2) {
      throw new Error('Match does not have both players assigned');
    }

    // Validate winner
    const winner = match.player1.id === winnerId ? match.player1 : 
                   match.player2.id === winnerId ? match.player2 : null;
    
    if (!winner) {
      throw new Error('Invalid winner ID');
    }

    // Update match
    match.winner = winner;
    match.score1 = score1;
    match.score2 = score2;
    match.isComplete = true;
    match.isActive = false;
    match.completedAt = new Date();

    // Advance winner to next round if applicable
    const nextRound = match.round + 1;
    const nextMatch = tournament.matches.find(m => 
      m.round === nextRound && 
      Math.floor(match.matchIndex / 2) === m.matchIndex
    );

    if (nextMatch) {
      if (match.matchIndex % 2 === 0) {
        nextMatch.player1 = winner;
      } else {
        nextMatch.player2 = winner;
      }

      // If both players are set for next match, make it active
      if (nextMatch.player1 && nextMatch.player2) {
        nextMatch.isActive = true;
      }
    } else {
      // This was the final match
      tournament.winner = winner;
      tournament.isComplete = true;
      tournament.status = 'completed';
    }

    // Update current round
    const currentRoundMatches = tournament.matches.filter(m => m.round === tournament.currentRound);
    const allCurrentRoundComplete = currentRoundMatches.every(m => m.isComplete);
    
    if (allCurrentRoundComplete && !tournament.isComplete) {
      tournament.currentRound++;
    }

    tournaments.set(tournamentId, tournament);
    return tournament;
  }

  function deleteTournament(id: string): number {
    const existed = tournaments.has(id);
    tournaments.delete(id);
    return existed ? 1 : 0;
  }

  // Legacy methods for backward compatibility
  function createTournamentLegacy(input: CreateTournamentBodyTS) {
    const now = new Date().toISOString();
    const runTx = db.transaction((payload: CreateTournamentBodyTS) => {
      const result = db
        .prepare(
          `INSERT INTO tournaments (nbOfPlayers, createdAt)
           VALUES (@nbOfPlayers, @createdAt)`
        )
        .run({ ...payload, createdAt: now });
      const newId = result.lastInsertRowid as number;
      return newId;
    });
    return runTx(input);
  }

  function getTournamentByIdLegacy(id: number): TournamentTS | null {
    const row = db
      .prepare('SELECT * FROM tournaments WHERE id = ?')
      .get(id) as TournamentTS | undefined;
    return row ?? null;
  }

  function deleteTournamentLegacy(id: number) {
    return db.prepare('DELETE FROM tournaments WHERE id = ?').run(id).changes;
  }

  return { 
    createTournament,
    getAllTournaments,
    getTournamentById,
    getTournamentByCode,
    joinTournament,
    fillWithAI,
    startTournament,
    startMatch,
    completeMatch,
    deleteTournament,
    // Legacy methods with different names to avoid conflicts
    createTournamentLegacy,
    getTournamentByIdLegacy,
    deleteTournamentLegacy
  };
}