export const SCHEMA_SQL = `
BEGIN;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS tournaments ( 
	id INTEGER PRIMARY KEY, name TEXT NOT NULL, 
	nbOfPlayers INTEGER NOT NULL CHECK (nbOfPlayers > 1), 
	createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) 
); 
CREATE TABLE IF NOT EXISTS games ( 
	id INTEGER PRIMARY KEY, 
	tournamentId INTEGER, 
	createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), 
	FOREIGN KEY (tournamentId) REFERENCES tournaments(id) ON DELETE CASCADE 
); 
CREATE INDEX IF NOT EXISTS idx_game_tournamentId ON games(tournamentId); 
CREATE TABLE IF NOT EXISTS game_players ( 
	id INTEGER PRIMARY KEY, 
	gameId INTEGER NOT NULL, 
	playerId INTEGER NOT NULL, 
	playerScore INTEGER NOT NULL DEFAULT 0 CHECK (playerScore >= 0), 
	createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), 
	updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), 
	UNIQUE (gameId, playerId), 
	FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
);
COMMIT;`;