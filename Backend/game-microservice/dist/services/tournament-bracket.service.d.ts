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
export declare function tournamentBracketService(app: FastifyInstance): {
    generateBracket: (tournamentDbId: number, players: BracketPlayer[]) => void;
    completeMatch: (matchId: number, winnerId: string, scorePlayer1: number, scorePlayer2: number) => Promise<void>;
    startMatch: (matchId: number) => void;
    getBracket: (tournamentCode: string) => TournamentBracket | null;
    getRoundName: (round: number, size: number) => string;
    getTotalRounds: (size: number) => number;
};
//# sourceMappingURL=tournament-bracket.service.d.ts.map