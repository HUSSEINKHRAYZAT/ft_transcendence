import type { FastifyInstance } from 'fastify';
import { CreateGameBodyTS, GameTS } from '../schemas/games.schema';

export function gamesService(app: FastifyInstance) {
  const db = app.db;

  function createGame(input: CreateGameBodyTS) {
	const now = new Date().toISOString();
	const runTx = db.transaction((payload: CreateGameBodyTS) => {
	  const result = db
		.prepare(
		  `INSERT INTO games (tournamentId, createdAt)
		   VALUES (@tournamentId, @createdAt)`
		)
		.run({ ...payload, createdAt: now });
	  const newId = result.lastInsertRowid as number;
	  return newId;
	});
	return runTx(input);
  }

  function getGameById(id: number): GameTS | null {
	const row = db
	  .prepare('SELECT * FROM games WHERE id = ?')
	  .get(id) as GameTS | undefined;
	return row ?? null;
  }

  function getTournamentGames(tournamentId: number): GameTS[] {
	const rows = db
	  .prepare('SELECT * FROM games WHERE tournamentId = ?')
	  .all(tournamentId) as GameTS[];
	return rows;
  }

  function deleteGame(id: number) {
	return db.prepare('DELETE FROM games WHERE id = ?').run(id).changes;
  }

  return { createGame, getGameById, getTournamentGames, deleteGame };
}