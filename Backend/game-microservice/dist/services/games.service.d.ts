import type { FastifyInstance } from 'fastify';
import { CreateGameBodyTS, GameTS } from '../schemas/games.schema';
export declare function gamesService(app: FastifyInstance): {
    createGame: (input: CreateGameBodyTS) => number;
    getGameById: (id: number) => GameTS | null;
    getTournamentGames: (tournamentId: number) => GameTS[];
    deleteGame: (id: number) => number;
};
//# sourceMappingURL=games.service.d.ts.map