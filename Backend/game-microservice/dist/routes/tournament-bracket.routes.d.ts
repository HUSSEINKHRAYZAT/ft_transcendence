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
export declare function tournamentBracketRoutes(app: FastifyInstance): Promise<void>;
//# sourceMappingURL=tournament-bracket.routes.d.ts.map