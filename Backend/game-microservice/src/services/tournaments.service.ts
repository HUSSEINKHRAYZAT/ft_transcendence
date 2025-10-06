import type { FastifyInstance } from 'fastify';
import { 
  CreateTournamentBodyTS, 
  TournamentTS, 
  JoinTournamentBodyTS,
  StartTournamentBodyTS,
  UpdateMatchBodyTS,
  TournamentPlayerTS,
  TournamentMatchTS 
} from '../schemas/tournaments.schema';

// Generate 6-character tournament code
function generateTournamentCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate bracket matches based on tournament size
function generateBracket(size: number, players: TournamentPlayerTS[]): TournamentMatchTS[] {
  const matches: TournamentMatchTS[] = [];
  const rounds = Math.log2(size);
  
  // Generate matches for each round (starting from finals working backwards)
  let matchId = 0;
  for (let round = 0; round < rounds; round++) {
    const matchesInRound = Math.pow(2, round);
    for (let i = 0; i < matchesInRound; i++) {
      const match: TournamentMatchTS = {
        id: `match_${matchId++}`,
        round: round,
        matchIndex: i,
        player1: null,
        player2: null,
        winner: null,
        status: 'pending',
      };
      
      // For first round (highest round number), assign players
      if (round === rounds - 1) {
        const player1Index = i * 2;
        const player2Index = i * 2 + 1;
        match.player1 = players[player1Index] || null;
        match.player2 = players[player2Index] || null;
        match.status = 'pending'; // Will be set to active for first match
      }
      
      matches.push(match);
    }
  }
  
  return matches;
}

export function tournamentsService(app: FastifyInstance) {
  const db = app.db;

  // Create tournament
  function createTournament(input: CreateTournamentBodyTS) {
    const tournamentId = generateTournamentCode();
    const now = new Date().toISOString();
    
    try {
      const result = db.prepare(`
        INSERT INTO tournament 
        (tournamentId, name, size, nbOfPlayers, status, createdBy, isPublic, allowSpectators, currentRound, createdAt, updatedAt)
        VALUES (?, ?, ?, 0, 'waiting', ?, ?, ?, 0, ?, ?)
      `).run(
        tournamentId,
        input.name,
        input.size,
        input.createdBy,
        input.isPublic ? 1 : 0,
        input.allowSpectators ? 1 : 0,
        now,
        now
      );

      // Add creator as first player
      const dbId = result.lastInsertRowid as number;
      db.prepare(`
        INSERT INTO tournament_players 
        (tournamentId, playerId, playerName, playerIndex, isOnline, isAI)
        VALUES (?, ?, ?, 0, 1, 0)
      `).run(dbId, input.createdBy, input.createdByName);

      db.prepare(`
        UPDATE tournament SET nbOfPlayers = 1 WHERE id = ?
      `).run(dbId);

      return getTournamentByCode(tournamentId);
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw error;
    }
  }

  // Get all tournaments
  function getAllTournaments(): TournamentTS[] {
    try {
      const rows = db.prepare(`
        SELECT * FROM tournament 
        WHERE status IN ('waiting', 'active')
        ORDER BY createdAt DESC
        LIMIT 100
      `).all();

      return rows.map((row: any) => enrichTournament(row));
    } catch (error) {
      console.error('Error getting all tournaments:', error);
      return [];
    }
  }

  // Get tournament by database ID
  function getTournamentById(id: number): TournamentTS | null {
    try {
      const row = db.prepare('SELECT * FROM tournament WHERE id = ?').get(id);
      return row ? enrichTournament(row as any) : null;
    } catch (error) {
      console.error('Error getting tournament by ID:', error);
      return null;
    }
  }

  // Get tournament by code
  function getTournamentByCode(code: string): TournamentTS | null {
    try {
      const row = db.prepare('SELECT * FROM tournament WHERE tournamentId = ?').get(code);
      return row ? enrichTournament(row as any) : null;
    } catch (error) {
      console.error('Error getting tournament by code:', error);
      return null;
    }
  }

  // Join tournament
  function joinTournament(input: JoinTournamentBodyTS): TournamentTS {
    const tournament = getTournamentByCode(input.tournamentId);
    if (!tournament) throw new Error('Tournament not found');
    if (tournament.status !== 'waiting') throw new Error('Tournament already started');
    if (tournament.nbOfPlayers >= tournament.size) throw new Error('Tournament is full');

    // Check if player already joined
    const existing = db.prepare(`
      SELECT * FROM tournament_players 
      WHERE tournamentId = (SELECT id FROM tournament WHERE tournamentId = ?) 
      AND playerId = ?
    `).get(input.tournamentId, input.playerId);

    if (existing) throw new Error('Player already joined this tournament');

    const playerIndex = tournament.nbOfPlayers;
    const dbId = (tournament as any).id;
    
    try {
      db.prepare(`
        INSERT INTO tournament_players 
        (tournamentId, playerId, playerName, playerIndex, isOnline, isAI)
        VALUES (?, ?, ?, ?, 1, 0)
      `).run(dbId, input.playerId, input.playerName, playerIndex);

      db.prepare(`
        UPDATE tournament 
        SET nbOfPlayers = nbOfPlayers + 1, updatedAt = ?
        WHERE tournamentId = ?
      `).run(new Date().toISOString(), input.tournamentId);

      const updated = getTournamentByCode(input.tournamentId);
      if (!updated) throw new Error('Failed to get updated tournament');
      return updated;
    } catch (error) {
      console.error('Error joining tournament:', error);
      throw error;
    }
  }

  // Start tournament
  function startTournament(input: StartTournamentBodyTS): TournamentTS {
    const tournament = getTournamentByCode(input.tournamentId);
    if (!tournament) throw new Error('Tournament not found');
    if (tournament.status !== 'waiting') throw new Error('Tournament already started');
    if (tournament.nbOfPlayers < 2) throw new Error('Need at least 2 players to start');

    const dbId = (tournament as any).id;

    try {
      // Generate bracket
      const matches = generateBracket(tournament.size, tournament.players);
      
      // Insert matches
      const firstRound = Math.log2(tournament.size) - 1;
      matches.forEach((match) => {
        // All first round matches should be 'active' so they can start simultaneously
        const matchStatus = match.round === firstRound ? 'active' : 'pending';
        
        db.prepare(`
          INSERT INTO tournament_matches 
          (tournamentId, matchId, round, matchIndex, player1Id, player2Id, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          dbId,
          match.id,
          match.round,
          match.matchIndex,
          match.player1?.id || null,
          match.player2?.id || null,
          matchStatus
        );
      });

      // Update tournament status
      const maxRound = Math.log2(tournament.size) - 1;
      db.prepare(`
        UPDATE tournament 
        SET status = 'active', currentRound = ?, updatedAt = ?
        WHERE tournamentId = ?
      `).run(maxRound, new Date().toISOString(), input.tournamentId);

      const updated = getTournamentByCode(input.tournamentId);
      if (!updated) throw new Error('Failed to get updated tournament');
      return updated;
    } catch (error) {
      console.error('Error starting tournament:', error);
      throw error;
    }
  }

  // Update match result
  function updateMatch(tournamentId: string, input: UpdateMatchBodyTS): TournamentTS {
    const tournament = getTournamentByCode(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const dbId = (tournament as any).id;

    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (input.player1Score !== undefined) {
        updates.push('player1Score = ?');
        values.push(input.player1Score);
      }
      if (input.player2Score !== undefined) {
        updates.push('player2Score = ?');
        values.push(input.player2Score);
      }
      if (input.winnerId) {
        updates.push('winnerId = ?');
        values.push(input.winnerId);
      }
      if (input.status) {
        updates.push('status = ?');
        values.push(input.status);
      }

      if (updates.length > 0) {
        updates.push('completedAt = ?');
        values.push(new Date().toISOString());
        values.push(dbId, input.matchId);

        db.prepare(`
          UPDATE tournament_matches 
          SET ${updates.join(', ')}
          WHERE tournamentId = ? AND matchId = ?
        `).run(...values);
      }

      const updated = getTournamentByCode(tournamentId);
      if (!updated) throw new Error('Failed to get updated tournament');
      return updated;
    } catch (error) {
      console.error('Error updating match:', error);
      throw error;
    }
  }

  // Delete tournament
  function deleteTournament(id: number) {
    try {
      return db.prepare('DELETE FROM tournament WHERE id = ?').run(id).changes;
    } catch (error) {
      console.error('Error deleting tournament:', error);
      return 0;
    }
  }

  // Helper: Enrich tournament with players and matches
  function enrichTournament(row: any): TournamentTS {
    try {
      // Get players
      const players = db.prepare(`
        SELECT * FROM tournament_players
        WHERE tournamentId = ?
        ORDER BY playerIndex
      `).all(row.id);

      // Get matches
      const matches = db.prepare(`
        SELECT * FROM tournament_matches
        WHERE tournamentId = ?
        ORDER BY round DESC, matchIndex
      `).all(row.id);

      const playerMap = new Map<string, TournamentPlayerTS>();
      const playersArray: TournamentPlayerTS[] = (players as any[]).map((p: any) => {
        const player: TournamentPlayerTS = {
          id: String(p.playerId),
          name: p.playerName,
          isOnline: Boolean(p.isOnline),
          isAI: Boolean(p.isAI),
          isEliminated: Boolean(p.isEliminated),
        };
        playerMap.set(player.id, player);
        return player;
      });

      const matchesArray: TournamentMatchTS[] = (matches as any[]).map((m: any) => {
        const player1 = m.player1Id ? playerMap.get(String(m.player1Id)) ?? null : null;
        const player2 = m.player2Id ? playerMap.get(String(m.player2Id)) ?? null : null;
        const winner = m.winnerId ? playerMap.get(String(m.winnerId)) ?? null : null;

        const hasScore = m.player1Score !== null && m.player2Score !== null &&
          m.player1Score !== undefined && m.player2Score !== undefined;
        const score: [number, number] | undefined = hasScore
          ? [Number(m.player1Score), Number(m.player2Score)]
          : undefined;

        const rawStatus = String(m.status);
        const statusValues: TournamentMatchTS['status'][] = ['pending', 'active', 'completed'];
        const status = (statusValues.includes(rawStatus as TournamentMatchTS['status'])
          ? rawStatus
          : 'pending') as TournamentMatchTS['status'];

        const match: TournamentMatchTS = {
          id: String(m.matchId),
          round: Number(m.round),
          matchIndex: Number(m.matchIndex),
          player1,
          player2,
          winner,
          status,
        };

        if (score !== undefined) {
          match.score = score;
        }

        if (m.gameId !== null && m.gameId !== undefined) {
          match.gameId = String(m.gameId);
        }

        return match;
      });

      return {
        id: row.id,
        tournamentId: row.tournamentId,
        name: row.name,
        size: row.size,
        nbOfPlayers: row.nbOfPlayers,
        status: row.status,
        createdBy: String(row.createdBy),
        isPublic: Boolean(row.isPublic),
        allowSpectators: Boolean(row.allowSpectators),
        currentRound: row.currentRound,
        players: playersArray,
        matches: matchesArray,
        winnerId: row.winnerId ? String(row.winnerId) : null,
        isComplete: row.status === 'completed',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    } catch (error) {
      console.error('Error enriching tournament:', error);
      throw error;
    }
  }

  return { 
    createTournament, 
    getTournamentById, 
    getTournamentByCode,
    getAllTournaments,
    joinTournament,
    startTournament,
    updateMatch,
    deleteTournament 
  };
}