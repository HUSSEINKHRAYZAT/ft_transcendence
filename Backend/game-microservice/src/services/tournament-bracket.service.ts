/**
 * Clean Tournament Bracket System
 * 
 * Features:
 * - Automatic bracket generation for 4 or 8 players
 * - Winner auto-advancement to next round
 * - Loser elimination (cannot play again)
 * - Single elimination tournament
 * - Real-time bracket updates
 */

import type { FastifyInstance } from 'fastify';

export interface BracketPlayer {
  id: string;
  username: string;
  seed: number;
  isEliminated: boolean;
  placement?: number;
}

export interface BracketMatch {
  id: number;
  tournamentId: number;
  round: number;
  matchNumber: number;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  scorePlayer1: number;
  scorePlayer2: number;
  status: 'pending' | 'ready' | 'active' | 'completed';
  startedAt?: Date;
  completedAt?: Date;
}

export interface TournamentBracket {
  id: number;
  code: string;
  name: string;
  size: 4 | 8;
  status: 'waiting' | 'active' | 'completed';
  currentRound: number;
  winnerId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  players: BracketPlayer[];
  matches: BracketMatch[];
}

export function tournamentBracketService(app: FastifyInstance) {
  const db = app.db;

  /**
   * Shuffle array for random seeding
   */
  function shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i] as T;
      shuffled[i] = shuffled[j] as T;
      shuffled[j] = temp;
    }
    return shuffled;
  }

  /**
   * Calculate total rounds for tournament size
   */
  function getTotalRounds(size: number): number {
    return Math.log2(size);
  }

  /**
   * Get round name based on round number and tournament size
   */
  function getRoundName(round: number, size: number): string {
    const totalRounds = getTotalRounds(size);
    const roundsFromEnd = totalRounds - round + 1;

    if (roundsFromEnd === 1) return 'Final';
    if (roundsFromEnd === 2) return 'Semifinals';
    if (roundsFromEnd === 3) return 'Quarterfinals';
    
    return `Round ${round}`;
  }

  /**
   * Generate bracket structure for tournament
   * Only Round 1 matches have players assigned initially
   * All other matches start as 'pending' until prerequisites complete
   */
  function generateBracket(tournamentDbId: number, players: BracketPlayer[]): void {
    const size = players.length;
    const totalRounds = getTotalRounds(size);
    
    // Shuffle players for random seeding
    const shuffled = shuffle(players);
    
    // Update player seeds
    shuffled.forEach((player, index) => {
      db.prepare(`
        UPDATE tournament_players 
        SET seed = ?
        WHERE tournament_id = ? AND user_id = ?
      `).run(index + 1, tournamentDbId, player.id);
    });


    // Generate all rounds
    for (let round = 1; round <= totalRounds; round++) {
      const matchesInRound = Math.pow(2, totalRounds - round);
      
      for (let matchNum = 0; matchNum < matchesInRound; matchNum++) {
        const matchData: any = {
          tournament_id: tournamentDbId,
          round: round,
          match_number: matchNum,
          status: 'pending',
          score_player1: 0,
          score_player2: 0
        };

        // Only assign players to Round 1
        if (round === 1) {
          const player1 = shuffled[matchNum * 2];
          const player2 = shuffled[matchNum * 2 + 1];
          
          matchData.player1_id = player1?.id || null;
          matchData.player2_id = player2?.id || null;
          matchData.status = 'ready'; // Both players assigned, match is ready
          
        }

        // Insert match
        db.prepare(`
          INSERT INTO tournament_matches 
          (tournament_id, round, match_number, player1_id, player2_id, winner_id, score_player1, score_player2, status)
          VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)
        `).run(
          matchData.tournament_id,
          matchData.round,
          matchData.match_number,
          matchData.player1_id,
          matchData.player2_id,
          matchData.score_player1,
          matchData.score_player2,
          matchData.status
        );
      }
    }

   
  }

  /**
   * Complete a match and advance the winner
   */
  async function completeMatch(
    matchId: number,
    winnerId: string,
    scorePlayer1: number,
    scorePlayer2: number
  ): Promise<void> {
    // Get match details
    const match = db.prepare(`
      SELECT * FROM tournament_matches WHERE id = ?
    `).get(matchId) as any;

    if (!match) {
      throw new Error('Match not found');
    }

    if (match.status === 'completed') {
      throw new Error('Match already completed');
    }

    // Validate winner is one of the players
    if (winnerId !== match.player1_id && winnerId !== match.player2_id) {
      throw new Error('Winner must be one of the match players');
    }

   

    // Mark match as completed
    db.prepare(`
      UPDATE tournament_matches 
      SET status = 'completed',
          winner_id = ?,
          score_player1 = ?,
          score_player2 = ?,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(winnerId, scorePlayer1, scorePlayer2, matchId);

    // Eliminate the loser
    const loserId = match.player1_id === winnerId ? match.player2_id : match.player1_id;
    
    db.prepare(`
      UPDATE tournament_players 
      SET is_eliminated = 1
      WHERE tournament_id = ? AND user_id = ?
    `).run(match.tournament_id, loserId);


    // Advance winner to next round
    await advanceWinner(match, winnerId);

    // Update tournament current round if needed
    updateTournamentRound(match.tournament_id);
  }

  /**
   * Check if ALL matches in a specific round are completed
   */
  function areAllMatchesInRoundCompleted(tournamentId: number, round: number): boolean {
    const incompleteMatches = db.prepare(`
      SELECT COUNT(*) as count
      FROM tournament_matches
      WHERE tournament_id = ? AND round = ? AND status != 'completed'
    `).get(tournamentId, round) as any;

    return incompleteMatches.count === 0;
  }

  /**
   * Advance all winners from a completed round to the next round
   */
  function advanceAllWinnersToNextRound(tournamentId: number, completedRound: number): void {
    const nextRound = completedRound + 1;


    // Get all completed matches from the round
    const completedMatches = db.prepare(`
      SELECT * FROM tournament_matches
      WHERE tournament_id = ? AND round = ? AND status = 'completed'
      ORDER BY match_number ASC
    `).all(tournamentId, completedRound) as any[];

    // Advance each winner
    for (const match of completedMatches) {
      const nextMatchNumber = Math.floor(match.match_number / 2);
      const isPlayer1Slot = match.match_number % 2 === 0;


      // Get the next match
      const nextMatch = db.prepare(`
        SELECT * FROM tournament_matches
        WHERE tournament_id = ? AND round = ? AND match_number = ?
      `).get(tournamentId, nextRound, nextMatchNumber) as any;

      if (!nextMatch) {
        continue;
      }

      // Assign winner to appropriate slot
      if (isPlayer1Slot) {
        db.prepare(`
          UPDATE tournament_matches 
          SET player1_id = ?
          WHERE id = ?
        `).run(match.winner_id, nextMatch.id);
      } else {
        db.prepare(`
          UPDATE tournament_matches 
          SET player2_id = ?
          WHERE id = ?
        `).run(match.winner_id, nextMatch.id);
      }
    }

    // Now mark all next-round matches as 'ready' if both players are assigned
    const nextRoundMatches = db.prepare(`
      SELECT * FROM tournament_matches
      WHERE tournament_id = ? AND round = ?
    `).all(tournamentId, nextRound) as any[];

    for (const match of nextRoundMatches) {
      if (match.player1_id && match.player2_id) {
        db.prepare(`
          UPDATE tournament_matches 
          SET status = 'ready'
          WHERE id = ?
        `).run(match.id);

      }
    }
  }

  /**
   * Advance winner to the next round
   * NEW: Only advances when ALL matches in current round are completed
   */
  async function advanceWinner(completedMatch: any, winnerId: string): Promise<void> {
    const nextRound = completedMatch.round + 1;
    
    // Get tournament info
    const tournament = db.prepare(`
      SELECT * FROM tournaments WHERE id = ?
    `).get(completedMatch.tournament_id) as any;

    const totalRounds = getTotalRounds(tournament.size);

    // Check if this was the final match
    if (nextRound > totalRounds) {
      
      // Mark tournament as completed
      db.prepare(`
        UPDATE tournaments 
        SET status = 'completed',
            winner_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(winnerId, tournament.id);

      // Set winner placement
      db.prepare(`
        UPDATE tournament_players
        SET placement = 1
        WHERE tournament_id = ? AND user_id = ?
      `).run(tournament.id, winnerId);

      return;
    }

    // Check if ALL matches in the current round are now completed
    const allRoundMatchesComplete = areAllMatchesInRoundCompleted(
      completedMatch.tournament_id,
      completedMatch.round
    );

    if (!allRoundMatchesComplete) {
      // Not all matches complete yet - don't advance anyone
      return;
    }

    // All matches in this round are complete - advance ALL winners simultaneously
    advanceAllWinnersToNextRound(completedMatch.tournament_id, completedMatch.round);
  }

  /**
   * Update tournament current round based on active matches
   */
  function updateTournamentRound(tournamentId: number): void {
    // Find the lowest round with active or ready matches
    const activeRound = db.prepare(`
      SELECT MIN(round) as current_round
      FROM tournament_matches
      WHERE tournament_id = ? 
        AND status IN ('ready', 'active')
    `).get(tournamentId) as any;

    if (activeRound?.current_round) {
      db.prepare(`
        UPDATE tournaments
        SET current_round = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(activeRound.current_round, tournamentId);
    }
  }

  /**
   * Start a match (mark as active)
   */
  function startMatch(matchId: number): void {
    const match = db.prepare(`
      SELECT * FROM tournament_matches WHERE id = ?
    `).get(matchId) as any;

    if (!match) {
      throw new Error('Match not found');
    }

    if (match.status !== 'ready') {
      throw new Error('Match is not ready to start');
    }

    db.prepare(`
      UPDATE tournament_matches
      SET status = 'active',
          started_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(matchId);

  }

  /**
   * Get complete bracket for a tournament
   */
  function getBracket(tournamentCode: string): TournamentBracket | null {
    // Get tournament
    const tournament = db.prepare(`
      SELECT * FROM tournaments WHERE code = ?
    `).get(tournamentCode) as any;

    if (!tournament) {
      return null;
    }

    // Get players
    const players = db.prepare(`
      SELECT 
        user_id as id,
        username,
        seed,
        is_eliminated as isEliminated,
        placement
      FROM tournament_players
      WHERE tournament_id = ?
      ORDER BY seed ASC
    `).all(tournament.id) as BracketPlayer[];

    // Get matches
    const matches = db.prepare(`
      SELECT 
        id,
        tournament_id as tournamentId,
        round,
        match_number as matchNumber,
        player1_id as player1Id,
        player2_id as player2Id,
        winner_id as winnerId,
        score_player1 as scorePlayer1,
        score_player2 as scorePlayer2,
        status,
        started_at as startedAt,
        completed_at as completedAt
      FROM tournament_matches
      WHERE tournament_id = ?
      ORDER BY round ASC, match_number ASC
    `).all(tournament.id) as BracketMatch[];

    return {
      id: tournament.id,
      code: tournament.code,
      name: tournament.name,
      size: tournament.size,
      status: tournament.status,
      currentRound: tournament.current_round,
      winnerId: tournament.winner_id,
      createdBy: tournament.created_by,
      createdAt: new Date(tournament.created_at),
      updatedAt: new Date(tournament.updated_at),
      players,
      matches
    };
  }

  return {
    generateBracket,
    completeMatch,
    startMatch,
    getBracket,
    getRoundName,
    getTotalRounds
  };
}
