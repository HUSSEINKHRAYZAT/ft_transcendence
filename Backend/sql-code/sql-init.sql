BEGIN; 
PRAGMA foreign_keys = ON; 
CREATE TABLE users (
	id INTEGER PRIMARY KEY, 
	firstName TEXT NOT NULL, 
	lastName TEXT NOT NULL, 
	username TEXT NOT NULL UNIQUE, 
	email TEXT NOT NULL UNIQUE, 
	hashedPassword TEXT NOT NULL, 
	isVerified INTEGER NOT NULL DEFAULT 0, 
	twoFactorEnabled INTEGER NOT NULL DEFAULT 0, 
	profilePath TEXT, status TEXT NOT NULL, 
	createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), 
	updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) 
); 
CREATE TABLE statistics ( 
	id INTEGER PRIMARY KEY, 
	userId INTEGER NOT NULL, 
	winCount INTEGER NOT NULL DEFAULT 0 CHECK (winCount >= 0), 
	lossCount INTEGER NOT NULL DEFAULT 0 CHECK (lossCount >= 0), 
	tournamentWinCount INTEGER NOT NULL DEFAULT 0 CHECK (tournamentWinCount >= 0), 
	tournamentCount INTEGER NOT NULL DEFAULT 0 CHECK (tournamentCount >= 0), 
	createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), 
	updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), 
	UNIQUE (userId), 
	FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE 
); 
CREATE INDEX idx_statistics_userId ON statistics(userId); 
CREATE TABLE tournament ( 
	id INTEGER PRIMARY KEY, name TEXT NOT NULL, 
	nbOfPlayers INTEGER NOT NULL CHECK (nbOfPlayers > 1), 
	createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) 
); 
CREATE TABLE game ( 
	id INTEGER PRIMARY KEY, 
	tournamentId INTEGER, 
	createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), 
	FOREIGN KEY (tournamentId) REFERENCES tournament(id) ON DELETE CASCADE 
); 
CREATE INDEX idx_game_tournamentId ON game(tournamentId); 
CREATE TABLE sessions ( 
	id INTEGER PRIMARY KEY, 
	userId INTEGER NOT NULL, 
	code TEXT NOT NULL UNIQUE, 
	name TEXT, 
	socketId TEXT NOT NULL UNIQUE, 
	createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), 
	expiresAt TEXT, FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE 
); 
CREATE INDEX idx_sessions_userId ON sessions(userId); 
CREATE TABLE game_players ( 
	id INTEGER PRIMARY KEY, 
	gameId INTEGER NOT NULL, 
	playerId INTEGER NOT NULL, 
	playerScore INTEGER NOT NULL DEFAULT 0 CHECK (playerScore >= 0), 
	createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), 
	updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), 
	UNIQUE (gameId, playerId), 
	FOREIGN KEY (gameId) REFERENCES game(id) ON DELETE CASCADE, 
	FOREIGN KEY (playerId) REFERENCES users(id) ON DELETE CASCADE 
); 
CREATE INDEX idx_gp_playerId ON game_players(playerId); 
CREATE TABLE user_relation_type ( 
	id INTEGER PRIMARY KEY, 
	type TEXT NOT NULL UNIQUE, 
	createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) 
); 
CREATE TABLE user_relation ( 
	id INTEGER PRIMARY KEY, 
	userOneId INTEGER NOT NULL, 
	userTwoId INTEGER NOT NULL, 
	typeId INTEGER NOT NULL, 
	createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), 
	updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), 
	CHECK (userOneId <> userTwoId), UNIQUE (typeId, userOneId, userTwoId), 
	FOREIGN KEY (userOneId) REFERENCES users(id) ON DELETE CASCADE, 
	FOREIGN KEY (userTwoId) REFERENCES users(id) ON DELETE CASCADE, 
	FOREIGN KEY (typeId) REFERENCES user_relation_type(id) ON DELETE CASCADE 
); 
CREATE INDEX idx_ur_userTwoId ON user_relation(userTwoId); 
COMMIT; 
-- Optional helper view that exposes totalGames without storing it 
CREATE VIEW statistics_view AS 
SELECT s.*, (s.winCount + s.lossCount) AS totalGames FROM statistics s;