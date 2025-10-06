import type { FastifyInstance } from 'fastify';
import { CreateTournamentBodyTS, TournamentTS, JoinTournamentBodyTS, StartTournamentBodyTS, UpdateMatchBodyTS } from '../schemas/tournaments.schema';
export declare function tournamentsService(app: FastifyInstance): {
    createTournament: (input: CreateTournamentBodyTS) => {
        id?: number;
        updatedAt?: string;
        createdByName?: string;
        matches?: {
            gameId?: string | null;
            score?: [number, number];
            id: string;
            round: number;
            matchIndex: number;
            player1: {
                isEliminated?: boolean;
                name: string;
                id: string;
                isOnline: boolean;
                isAI: boolean;
            } | null;
            player2: {
                isEliminated?: boolean;
                name: string;
                id: string;
                isOnline: boolean;
                isAI: boolean;
            } | null;
            winner: {
                isEliminated?: boolean;
                name: string;
                id: string;
                isOnline: boolean;
                isAI: boolean;
            } | null;
            status: "pending" | "active" | "completed";
        }[];
        winnerId?: string | null;
        isComplete?: boolean;
        name: string;
        createdAt: string;
        tournamentId: string;
        status: "active" | "completed" | "waiting";
        size: number;
        nbOfPlayers: number;
        createdBy: string;
        isPublic: boolean;
        allowSpectators: boolean;
        currentRound: number;
        players: {
            isEliminated?: boolean;
            name: string;
            id: string;
            isOnline: boolean;
            isAI: boolean;
        }[];
    } | null;
    getTournamentById: (id: number) => TournamentTS | null;
    getTournamentByCode: (code: string) => TournamentTS | null;
    getAllTournaments: () => TournamentTS[];
    joinTournament: (input: JoinTournamentBodyTS) => TournamentTS;
    startTournament: (input: StartTournamentBodyTS) => TournamentTS;
    updateMatch: (tournamentId: string, input: UpdateMatchBodyTS) => TournamentTS;
    deleteTournament: (id: number) => number;
};
//# sourceMappingURL=tournaments.service.d.ts.map