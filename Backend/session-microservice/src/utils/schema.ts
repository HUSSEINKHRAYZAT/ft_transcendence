export const SCHEMA_SQL = `
BEGIN;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY,
  userId INTEGER NOT NULL,
  code INTEGER NOT NULL UNIQUE,
  socketId TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId);

COMMIT;
`;
