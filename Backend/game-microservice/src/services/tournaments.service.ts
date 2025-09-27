import type { FastifyInstance } from 'fastify';
import { CreateTournamentBodyTS, TournamentTS } from '../schemas/tournaments.schema';

export function tournamentsService(app: FastifyInstance) {
  const db = app.db;

  function createTournament(input: CreateTournamentBodyTS) {
	const now = new Date().toISOString();
	const runTx = db.transaction((payload: CreateTournamentBodyTS) => {
	  const result = db
		.prepare(
		  `INSERT INTO tournaments (nbOfPlayers, createdAt)
		   VALUES (@nbOfPlayers, @createdAt)`
		)
		.run({ ...payload, createdAt: now });
	  const newId = result.lastInsertRowid as number;
	  return newId;
	});
	return runTx(input);
  }

  function getTournamentById(id: number): TournamentTS | null {
	const row = db
	  .prepare('SELECT * FROM tournaments WHERE id = ?')
	  .get(id) as TournamentTS | undefined;
	return row ?? null;
  }

  function deleteTournament(id: number) {
	return db.prepare('DELETE FROM tournaments WHERE id = ?').run(id).changes;
  }

  return { createTournament, getTournamentById, deleteTournament };
}