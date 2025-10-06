"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gamePlayersService = gamePlayersService;
function gamePlayersService(app) {
    const db = app.db;
    function createGamePlayer(input) {
        const now = new Date().toISOString();
        const runTx = db.transaction((payload) => {
            const result = db
                .prepare(`INSERT INTO game_players (gameId, playerId, playerScore, createdAt, updatedAt)
		   VALUES (@gameId, @playerId, @playerScore, @createdAt, @updatedAt)`)
                .run({ ...payload, createdAt: now, updatedAt: now });
            const newId = result.lastInsertRowid;
            return newId;
        });
        return runTx(input);
    }
    function getGamePlayerById(id) {
        const row = db
            .prepare('SELECT * FROM game_players WHERE id = ?')
            .get(id);
        return row ?? null;
    }
    function getGamePlayersByGameId(gameId) {
        const rows = db
            .prepare('SELECT * FROM game_players WHERE gameId = ?')
            .all(gameId);
        return rows;
    }
    function updateGamePlayer(id, input) {
        const now = new Date().toISOString();
        const result = db
            .prepare(`UPDATE game_players
		 SET gameId = @gameId,
			 playerId = @playerId,
			 playerScore = @playerScore,
			 updatedAt = @updatedAt
		 WHERE id = @id`)
            .run({ ...input, updatedAt: now, id });
        return result.changes;
    }
    function deleteGamePlayer(id) {
        return db.prepare('DELETE FROM game_players WHERE id = ?').run(id).changes;
    }
    return {
        createGamePlayer,
        getGamePlayerById,
        getGamePlayersByGameId,
        updateGamePlayer,
        deleteGamePlayer,
    };
}
//# sourceMappingURL=game_players.service.js.map