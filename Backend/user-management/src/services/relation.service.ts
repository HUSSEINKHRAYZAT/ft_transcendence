import type { FastifyInstance } from 'fastify';
import { relationTypeService } from './relation_type.service';
import type { UpdateRelationBodyTS } from '../schemas/relation.schema';

export function relationService(app: FastifyInstance) {
  const db = app.db;
  const rts = relationTypeService(app);

  function relationExists(userOneId: number, userTwoId: number): boolean {
    const row = db
      .prepare(
        `SELECT 1
         FROM user_relation
         WHERE (userOneId = @u1 AND userTwoId = @u2)
         LIMIT 1`
      )
      .get({ u1: userOneId, u2: userTwoId });
    return !!row;
  }

  function findRelationRow(userOneId: number, userTwoId: number) {
    return (
      db
        .prepare(
          `SELECT ur.id,
                  ur.userOneId,
                  ur.userTwoId,
                  ur.typeId,
                  ur.createdAt,
                  ur.updatedAt,
                  rt.type
           FROM user_relation ur
           JOIN user_relation_type rt ON ur.typeId = rt.id
           WHERE (ur.userOneId = @u1 AND ur.userTwoId = @u2)
              OR (ur.userOneId = @u2 AND ur.userTwoId = @u1)
           LIMIT 1`
        )
        .get({ u1: userOneId, u2: userTwoId }) as
        | { id: number; userOneId: number; userTwoId: number; typeId: number; createdAt: string; updatedAt: string; type: string }
        | null
    );
  }

  function findRelation(userOneId: number, userTwoId: number) {
    return (
      db
        .prepare(
          `SELECT ur.id,
                  ur.userOneId,
                  ur.userTwoId,
                  ur.typeId,
                  ur.createdAt,
                  ur.updatedAt,
                  rt.type
           FROM user_relation ur
           JOIN user_relation_type rt ON ur.typeId = rt.id
           WHERE (ur.userOneId = @u1 AND ur.userTwoId = @u2)
           LIMIT 1`
        )
        .get({ u1: userOneId, u2: userTwoId }) as
        | { id: number; userOneId: number; userTwoId: number; typeId: number; createdAt: string; updatedAt: string; type: string }
        | null
    );
  }

  function getRelation(userOneId: number, userTwoId: number) {
    return findRelation(userOneId, userTwoId);
  }

  function getRelationId(userOneId: number, userTwoId: number): number | null {
    const row = db
      .prepare(
        `SELECT id
         FROM user_relation
         WHERE (userOneId = @u1 AND userTwoId = @u2)
         LIMIT 1`
      )
      .get({ u1: userOneId, u2: userTwoId }) as { id: number } | undefined;
    return row ? row.id : null;
  }

  function createRelation(input: { typeId: number; userOneId: number; userTwoId: number }) {
    if (input.userOneId === input.userTwoId) return null;
    // if (relationExists(input.userOneId, input.userTwoId)) return null;
    const relation = findRelationRow(input.userOneId, input.userTwoId);
    if (relation) return null;

    const now = new Date().toISOString();
    const runTx = db.transaction((payload: typeof input) => {
      const res = db
        .prepare(
          `INSERT INTO user_relation (userOneId, userTwoId, typeId, createdAt, updatedAt)
           VALUES (@userOneId, @userTwoId, @typeId, @now, @now)`
        )
        .run({ ...payload, now });
      return res.lastInsertRowid as number;
    });
    return runTx(input);
  }

  function listRelations() {
    return db
      .prepare(
        `SELECT ur.id, ur.userOneId, ur.userTwoId, ur.typeId, ur.createdAt, ur.updatedAt, rt.type
         FROM user_relation ur
         JOIN user_relation_type rt ON ur.typeId = rt.id
         ORDER BY ur.id`
      )
      .all() as Array<{ id: number; userOneId: number; userTwoId: number; typeId: number; createdAt: string; updatedAt: string; type: string }>;
  }

  function isThereRelation(userOneId: number, userTwoId: number): boolean {
    return relationExists(userOneId, userTwoId);
  }

  function patchRelation(body: UpdateRelationBodyTS) {
    const typeId = rts.getTypeId(body.type);
    if (typeId == null) return 0;

    const id = getRelationId(body.userOneId, body.userTwoId);
    if (id == null) return -1;

    const now = new Date().toISOString();
    const res = db
      .prepare(
        `UPDATE user_relation
         SET typeId = @typeId,
             userOneId = @userOneId,
             userTwoId = @userTwoId,
             updatedAt = @now
         WHERE id = @id`
      )
      .run({ ...body, typeId, id, now });

    return res.changes; // 0 or 1
  }

  function listFriends(userId: number) {
    return db
      .prepare(
        `SELECT
          u.id AS id,
          u.username AS username,
          u.status AS status,
          u.profilePath AS profilePath
        FROM user_relation ur
        JOIN user_relation_type rt ON rt.id = ur.typeId
        JOIN users u ON u.id = CASE
          WHEN ur.userOneId = @uid THEN ur.userTwoId
          ELSE ur.userOneId
        END
        WHERE rt.type = 'FRIEND'
          AND (ur.userOneId = @uid OR ur.userTwoId = @uid)
        ORDER BY u.username`
      )
      .all({ uid: userId }) as Array<{ id: number; username: string; status: string; profilePath: string}>;
  }

  function listBlocked(userId: number)
  {
    return db
      .prepare(
        `SELECT
          u.id AS id,
          u.username AS username,
          u.status AS status,
          u.profilePath AS profilePath
        FROM user_relation ur
        JOIN user_relation_type rt ON rt.id = ur.typeId
        JOIN users u ON u.id = CASE
          WHEN ur.userOneId = @uid THEN ur.userTwoId
          ELSE ur.userOneId
        END
        WHERE rt.type = 'BLOCKED'
          AND (ur.userOneId = @uid OR ur.userTwoId = @uid)
        ORDER BY u.username`
      )
      .all({ uid: userId }) as Array<{ id: number; username: string; status: string; profilePath: string }>;
  }
  function listRequests(userId: number) {

    const data = db
      .prepare(
        `SELECT userOneId AS id, u.username AS username, u.profilePath AS profilePath
         FROM user_relation ur
         JOIN user_relation_type rt ON rt.id = ur.typeId
         JOIN users u ON u.id = ur.userOneId
         WHERE rt.type = 'PENDING'
           AND (ur.userTwoId = @uid)
         ORDER BY u.username`
      )
      .all({ uid: userId }) as Array<{ id: number; username: string }>;
    return data;
  }

  function deleteRelation(userOneId: number, userTwoId: number)
  {
    const data = findRelationRow(userOneId, userTwoId);
    if (!data) return 0;
    return db.prepare(`DELETE FROM user_relation WHERE id = ?`).run(data.id).changes;
  }


  return { createRelation, getRelation, deleteRelation, listRelations,listBlocked, listRequests, isThereRelation, getRelationId, patchRelation, listFriends };
}
