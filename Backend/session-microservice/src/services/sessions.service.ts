import type { FastifyInstance } from 'fastify';
import { CreateSessionBodyType, SessionType } from '../schemas/session.schema';

export function sessionsService(app: FastifyInstance) {
  const db = app.db;

  function createSession(input: CreateSessionBodyType) {
    const now = new Date().toISOString();
    const runTx = db.transaction((payload: CreateSessionBodyType) => {
      const result = db
        .prepare(
          `INSERT INTO sessions (userId, socketId, code, createdAt)
           VALUES (@userId, @socketId, @code, @createdAt)`
        )
        .run({ ...payload, createdAt: now });
      const newId = result.lastInsertRowid as number;
      return newId;
    });
    return runTx(input);
  }

  function getSocketIdByCode(code: number): number | null {
    const row = db
      .prepare('SELECT socketId FROM sessions WHERE code = ?')
      .get(code) as { socketId: number } | undefined;
    return row ? row.socketId : null;
  }

  function getSessionById(id: number): SessionType | null {
    const row = db
      .prepare('SELECT * FROM sessions WHERE id = ?')
      .get(id) as SessionType | undefined;
    return row ?? null;
  }

  function deleteSession(code: number) {
    return db.prepare('DELETE FROM sessions WHERE code = ?').run(code).changes;
  }

  return { createSession, getSocketIdByCode, deleteSession, getSessionById };
}
