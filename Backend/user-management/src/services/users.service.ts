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
      db.prepare('INSERT INTO settings (username) VALUES (?)').run(payload.username);
      return newId;
    });
    return runTx(input);
  }

  function updatePassword(email: string, newHashedPassword: string) {
    const now = new Date().toISOString();
    const info = db
      .prepare(`UPDATE users SET isVerified = 1, hashedPassword = ?, updatedAt = ? WHERE email = ?`)
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
    const user = getUserById(id);
    db.prepare(`DELETE FROM settings WHERE username = ?`).run(user.username);
    db.prepare(`DELETE FROM statistics WHERE userId = ?`).run(id);
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

  function usernameExists(username: string) {
    return !!app.db.prepare(`SELECT 1 FROM users WHERE username = ?`).get(username);
  }

  function createWithRandomPassword(data: { firstName: string; lastName: string; username: string; email: string; profilePath?: string; status: string }) {
    const crypto = require('crypto');
    const random = crypto.randomBytes(16).toString('hex');
    
    return (async () => {
      const hashedPw = await require('../utils/hash').hashPassword(random);
      const stmt = app.db.prepare(`
        INSERT INTO users (firstName, lastName, username, email, hashedPassword, isVerified, twoFactorEnabled, profilePath, status) 
        VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)
      `);
      const info = stmt.run(data.firstName, data.lastName, data.username, data.email, hashedPw, data.profilePath ?? null, data.status);
      return info.lastInsertRowid as number;
    })();
  }

  async function upsertOAuthUser(input: { email: string; firstName: string; lastName: string; username: string; profilePath?: string; status: string }) {
    const existing = getUserByEmail(input.email);
    
    if (existing) {
      app.db.prepare(`
        UPDATE users 
        SET firstName = ?, lastName = ?, profilePath = ?, isVerified = 1, updatedAt = (strftime('%Y-%m-%dT%H:%M:%fZ','now')) 
        WHERE id = ?
      `).run(
        input.firstName,
        input.lastName,
        input.profilePath ?? existing.profilePath ?? null,
        existing.id
      );
      return existing.id as number;
    }

    let uname = input.username;
    if (usernameExists(uname)) {
      uname = `${uname}${Math.floor(Math.random() * 9000 + 1000)}`;
    }
    
    return await createWithRandomPassword({ ...input, username: uname });
  }

  return { createUser, updateUser, getUserById, getUserSensitiveByUsername, listUsers, deleteUser, getUserByEmail, getUserByUsername, verifyMail, updatePassword, upsertOAuthUser };
}