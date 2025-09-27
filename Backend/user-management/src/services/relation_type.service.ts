import type { FastifyInstance } from 'fastify';

export function relationTypeService(app: FastifyInstance) {
  const db = app.db;

  function createRelationType(input: { type: string }) {
    const now = new Date().toISOString();
    const runTx = db.transaction((payload: typeof input) => {
      const transformed = {
        type: payload.type.toUpperCase(),
        createdAt: now,
      };
      const res = db
        .prepare(
          `INSERT INTO user_relation_type (type, createdAt)
           VALUES (@type, @createdAt)`
        )
        .run(transformed);
      return res.lastInsertRowid as number;
    });
    return runTx(input);
  }

  function listTypes(limit = 100, offset = 0) {
    return db
      .prepare(
        `SELECT id, type, createdAt
         FROM user_relation_type
         ORDER BY id
         LIMIT @limit OFFSET @offset`
      )
      .all({ limit, offset }) as Array<{ id: number; type: string; createdAt: string }>;
  }

  function getTypeId(type: string): number | null {
    const row = db
      .prepare(`SELECT id FROM user_relation_type WHERE type = ?`)
      .get(type.toUpperCase()) as { id: number } | undefined;
    return row ? row.id : null;
  }

  function getTypeById(id: number) {
    return db
      .prepare(`SELECT id, type FROM user_relation_type WHERE id = ?`)
      .get(id) as { id: number; type: string } | undefined;
  }

  return { createRelationType, getTypeId, listTypes, getTypeById };
}
