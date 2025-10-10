import type { FastifyInstance } from 'fastify';
import { CreateGamePlayerBodyTS, GamePlayerTS, UpdateGamePlayerBodyTS } from '../schemas/game_players.schema';

export function gamePlayersService(app: FastifyInstance) {
  const db = app.db;

  function createGamePlayer(input: CreateGamePlayerBodyTS) {
	const now = new Date().toISOString();
	const runTx = db.transaction((payload: CreateGamePlayerBodyTS) => {
	  const result = db
		.prepare(
		  `INSERT INTO game_players (gameId, playerId, playerScore, createdAt, updatedAt)
		   VALUES (@gameId, @playerId, @playerScore, @createdAt, @updatedAt)`
		)
		.run({ ...payload, createdAt: now, updatedAt: now });
	  const newId = result.lastInsertRowid as number;
	  return newId;
	});
	return runTx(input);
  }

  function getGamePlayerById(id: number): GamePlayerTS | null {
	const row = db
	  .prepare('SELECT * FROM game_players WHERE id = ?')
	  .get(id) as GamePlayerTS | undefined;
	return row ?? null;
  }

  function getGamePlayersByGameId(gameId: number): GamePlayerTS[] {
	const rows = db
	  .prepare('SELECT * FROM game_players WHERE gameId = ?')
	  .all(gameId) as GamePlayerTS[];
	return rows;
  }

  function updateGamePlayer(id: number, input: UpdateGamePlayerBodyTS): number {
	const now = new Date().toISOString();
	const result = db
	  .prepare(
		`UPDATE game_players
		 SET gameId = @gameId,
			 playerId = @playerId,
			 playerScore = @playerScore,
			 updatedAt = @updatedAt
		 WHERE id = @id`
	  )
	  .run({ ...input, updatedAt: now, id });
	return result.changes;
  }

  function deleteGamePlayer(id: number) {
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