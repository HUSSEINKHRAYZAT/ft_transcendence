"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gamesService = gamesService;
function gamesService(app) {
    const db = app.db;
    function createGame(input) {
        const now = new Date().toISOString();
        const runTx = db.transaction((payload) => {
            const result = db
                .prepare(`INSERT INTO games (tournamentId, createdAt)
		   VALUES (@tournamentId, @createdAt)`)
                .run({ ...payload, createdAt: now });
            const newId = result.lastInsertRowid;
            return newId;
        });
        return runTx(input);
    }
    function getGameById(id) {
        const row = db
            .prepare('SELECT * FROM games WHERE id = ?')
            .get(id);
        return row ?? null;
    }
    function getTournamentGames(tournamentId) {
        const rows = db
            .prepare('SELECT * FROM games WHERE tournamentId = ?')
            .all(tournamentId);
        return rows;
    }
    function deleteGame(id) {
        return db.prepare('DELETE FROM games WHERE id = ?').run(id).changes;
    }
    return { createGame, getGameById, getTournamentGames, deleteGame };
}
//# sourceMappingURL=games.service.js.map