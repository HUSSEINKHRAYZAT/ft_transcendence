import fp from 'fastify-plugin';
import type BetterSqlite3 from 'better-sqlite3';
import Database from 'better-sqlite3';
import { SCHEMA_SQL } from '../utils/schema';

export type DB = BetterSqlite3.Database;

export const dbPlugin = fp(async (app) => {
  const file = app.config.DB_FILE;
  const db: DB = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  try {
    db.exec(SCHEMA_SQL);
  } catch (e) {
    app.log.error({ err: e }, 'schema migration failed');
    throw e;
  }

  app.decorate('db', db);

  app.addHook('onClose', (instance, done) => {
    try {
      db.close();
      done();
    } catch (e) {
      done(e as Error);
    }
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    db: DB;
  }
}