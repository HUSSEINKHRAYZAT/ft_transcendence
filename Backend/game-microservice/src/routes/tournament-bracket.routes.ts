/**
 * Clean Tournament Bracket API Routes
 * 
 * Endpoints:
 * - POST /api/tournaments/create - Create new tournament
 * - POST /api/tournaments/join - Join tournament
 * - POST /api/tournaments/start - Start tournament (generate bracket)
 * - GET /api/tournaments/:code - Get tournament bracket
 * - POST /api/tournaments/match/:id/start - Start a match
 * - POST /api/tournaments/match/:id/complete - Complete a match
 */

import type { FastifyInstance } from 'fastify';
import { tournamentBracketService } from '../services/tournament-bracket.service';

export async function tournamentBracketRoutes(app: FastifyInstance) {
  const bracketService = tournamentBracketService(app);

  /**
   * Create a new tournament
   */
  app.post('/api/tournaments/create', async (request, reply) => {
    try {
      const { name, size, createdBy, createdByName } = request.body as any;

      // Validate size
      if (![4, 8].includes(size)) {
        return reply.code(400).send({ error: 'Tournament size must be 4 or 8' });
      }

      // Generate unique 6-character code
      const code = generateCode();

      // Insert tournament
      const result = app.db.prepare(`
        INSERT INTO tournaments (code, name, size, status, current_round, created_by, created_at, updated_at)
        VALUES (?, ?, ?, 'waiting', 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(code, name, size, createdBy);

      const tournamentId = result.lastInsertRowid as number;

      // Add creator as first player
      app.db.prepare(`
        INSERT INTO tournament_players (tournament_id, user_id, username, seed, is_eliminated, placement)
        VALUES (?, ?, ?, 1, 0, NULL)
      `).run(tournamentId, createdBy, createdByName);

      // Get complete bracket
      const bracket = bracketService.getBracket(code);

      return reply.send(bracket);
    } catch (error) {
      console.error('Error creating tournament:', error);
      return reply.code(500).send({ error: 'Failed to create tournament' });
    }
  });

  /**
   * Join a tournament
   */
  app.post('/api/tournaments/join', async (request, reply) => {
    try {
      const { code, userId, username } = request.body as any;

      // Get tournament
      const tournament = app.db.prepare(`
        SELECT * FROM tournaments WHERE code = ?
      `).get(code) as any;

      if (!tournament) {
        return reply.code(404).send({ error: 'Tournament not found' });
      }

      if (tournament.status !== 'waiting') {
        return reply.code(400).send({ error: 'Tournament already started' });
      }

      // Check if player already joined
      const existing = app.db.prepare(`
        SELECT * FROM tournament_players 
        WHERE tournament_id = ? AND user_id = ?
      `).get(tournament.id, userId);

      if (existing) {
        return reply.code(400).send({ error: 'Already joined this tournament' });
      }

      // Get current player count
      const playerCount = app.db.prepare(`
        SELECT COUNT(*) as count FROM tournament_players 
        WHERE tournament_id = ?
      `).get(tournament.id) as any;

      if (playerCount.count >= tournament.size) {
        return reply.code(400).send({ error: 'Tournament is full' });
      }

      // Add player
      app.db.prepare(`
        INSERT INTO tournament_players (tournament_id, user_id, username, seed, is_eliminated, placement)
        VALUES (?, ?, ?, ?, 0, NULL)
      `).run(tournament.id, userId, username, playerCount.count + 1);

      // Get updated bracket
      const bracket = bracketService.getBracket(code);

      return reply.send(bracket);
    } catch (error) {
      console.error('Error joining tournament:', error);
      return reply.code(500).send({ error: 'Failed to join tournament' });
    }
  });

  /**
   * Start tournament (generate bracket)
   */
  app.post('/api/tournaments/start', async (request, reply) => {
    try {
      const { code } = request.body as any;

      // Get tournament
      const tournament = app.db.prepare(`
        SELECT * FROM tournaments WHERE code = ?
      `).get(code) as any;

      if (!tournament) {
        return reply.code(404).send({ error: 'Tournament not found' });
      }

      if (tournament.status !== 'waiting') {
        return reply.code(400).send({ error: 'Tournament already started' });
      }

      // Get players
      const players = app.db.prepare(`
        SELECT user_id as id, username, seed, is_eliminated as isEliminated, placement
        FROM tournament_players
        WHERE tournament_id = ?
      `).all(tournament.id) as any[];

      if (players.length < tournament.size) {
        return reply.code(400).send({ 
          error: `Not enough players (${players.length}/${tournament.size})` 
        });
      }

      // Generate bracket
      bracketService.generateBracket(tournament.id, players);

      // Update tournament status
      app.db.prepare(`
        UPDATE tournaments 
        SET status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(tournament.id);

      // Get complete bracket
      const bracket = bracketService.getBracket(code);


      return reply.send(bracket);
    } catch (error) {
      console.error('Error starting tournament:', error);
      return reply.code(500).send({ error: 'Failed to start tournament' });
    }
  });

  /**
   * Get tournament bracket
   */
  app.get('/api/tournaments/:code', async (request, reply) => {
    try {
      const { code } = request.params as any;

      const bracket = bracketService.getBracket(code);

      if (!bracket) {
        return reply.code(404).send({ error: 'Tournament not found' });
      }

      return reply.send(bracket);
    } catch (error) {
      console.error('Error getting tournament:', error);
      return reply.code(500).send({ error: 'Failed to get tournament' });
    }
  });

  /**
   * Start a match
   */
  app.post('/api/tournaments/match/:id/start', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const matchId = parseInt(id);

      bracketService.startMatch(matchId);

      // Get match details for tournament code
      const match = app.db.prepare(`
        SELECT tm.*, t.code
        FROM tournament_matches tm
        JOIN tournaments t ON t.id = tm.tournament_id
        WHERE tm.id = ?
      `).get(matchId) as any;

      // Get updated bracket
      const bracket = bracketService.getBracket(match.code);

      return reply.send(bracket);
    } catch (error: any) {
      console.error('Error starting match:', error);
      return reply.code(400).send({ error: error.message });
    }
  });

  /**
   * Complete a match and advance winner
   */
  app.post('/api/tournaments/match/:id/complete', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { winnerId, scorePlayer1, scorePlayer2 } = request.body as any;
      const matchId = parseInt(id);

      await bracketService.completeMatch(matchId, winnerId, scorePlayer1, scorePlayer2);

      // Get match details for tournament code
      const match = app.db.prepare(`
        SELECT tm.*, t.code
        FROM tournament_matches tm
        JOIN tournaments t ON t.id = tm.tournament_id
        WHERE tm.id = ?
      `).get(matchId) as any;

      // Get updated bracket
      const bracket = bracketService.getBracket(match.code);

      // Broadcast update to all connected clients
      // (WebSocket implementation would go here)

      return reply.send(bracket);
    } catch (error: any) {
      console.error('Error completing match:', error);
      return reply.code(400).send({ error: error.message });
    }
  });
}

/**
 * Generate random 6-character tournament code
 */
function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
