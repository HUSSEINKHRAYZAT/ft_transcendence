import type { FastifyInstance } from 'fastify';

const USER_FIELDS = `id, firstName, lastName, username, email, isVerified, isLoggedIn, twoFactorEnabled, profilePath, status, createdAt, updatedAt`;

export function usersService(app: FastifyInstance) {
  const db = app.db;

  function createUser(input: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
  }) {
    const now = new Date().toISOString();
    const runTx = db.transaction((payload: typeof input) => {
      const result = db
        .prepare(
          `INSERT INTO users (firstName, lastName, username, email, hashedPassword, status, createdAt, updatedAt)
           VALUES (@firstName, @lastName, @username, @email, @password, @status, @createdAt, @updatedAt)`
        )
        .run({ ...payload, status: 'offline',createdAt: now, updatedAt: now });
      const newId = result.lastInsertRowid as number;
      db.prepare('INSERT INTO statistics (userId) VALUES (?)').run(newId);
      return newId;
    });
    return runTx(input);
  }

  function updatePassword(email: string, newHashedPassword: string) {
    const now = new Date().toISOString();
    const info = db
      .prepare(`UPDATE users SET hashedPassword = ?, updatedAt = ? WHERE email = ?`)
      .run(newHashedPassword, now, email);
    return info.changes;
  }

  function updateUser(id: number, patch: Record<string, unknown>) {
    const fields: string[] = [];
    const params: Record<string, unknown> = { id };
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      if (k === 'password' || k === 'hashedPassword' || k === 'id') continue;
      fields.push(`${k} = @${k}`);
      params[k] = v;
    }
    params.updatedAt = new Date().toISOString();
    fields.push('updatedAt = @updatedAt');
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = @id`;
    const info = db.prepare(sql).run(params);
    return info.changes;
  }

  function getUserById(id: number) {
    return db.prepare(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`).get(id) as any;
  }

  function getUserSensitiveByUsername(username: string) {
    return db
      .prepare(`SELECT ${USER_FIELDS} ,hashedPassword FROM users WHERE username = ?`)
      .get(username) as any;
  }

  function listUsers(limit = 50, offset = 0) {
    return db
      .prepare(`SELECT ${USER_FIELDS} FROM users ORDER BY id LIMIT ? OFFSET ?`)
      .all(limit, offset) as any[];
  }

  function deleteUser(id: number) {
    return db.prepare(`DELETE FROM users WHERE id = ?`).run(id).changes;
  }

  function verifyMail(email: string) {
    return db.prepare(`UPDATE users SET isVerified = 1 WHERE email = ?`).run(email).changes;
  }

  function getUserByUsername(username: string) {
    const row = app.db
      .prepare(`SELECT id, firstName, lastName, username, email, isVerified, twoFactorEnabled, profilePath, status, createdAt, updatedAt
              FROM users WHERE username = ?`)
      .get(username);
    return row as any | undefined;
  }

  function getUserByEmail(email: string) {
    const row = app.db
      .prepare(`SELECT ${USER_FIELDS}, hashedPassword FROM users WHERE email = ?`)
      .get(email);
    return row as any | undefined;
  }

  return { createUser, updateUser, getUserById, getUserSensitiveByUsername, listUsers, deleteUser, getUserByEmail, getUserByUsername, verifyMail, updatePassword };
}