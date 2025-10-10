import type { FastifyInstance } from 'fastify';
import { CreateGamePlayerBodyTS, GamePlayerTS, UpdateGamePlayerBodyTS } from '../schemas/game_players.schema';
export declare function gamePlayersService(app: FastifyInstance): {
    createGamePlayer: (input: CreateGamePlayerBodyTS) => number;
    getGamePlayerById: (id: number) => GamePlayerTS | null;
    getGamePlayersByGameId: (gameId: number) => GamePlayerTS[];
    updateGamePlayer: (id: number, input: UpdateGamePlayerBodyTS) => number;
    deleteGamePlayer: (id: number) => number;
};
//# sourceMappingURL=game_players.service.d.ts.map