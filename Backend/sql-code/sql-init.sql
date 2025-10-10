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
	id INTEGER PRIMARY KEY, 
	tournamentId TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL, 
	size INTEGER NOT NULL CHECK (size > 1),
	nbOfPlayers INTEGER NOT NULL CHECK (nbOfPlayers > 1), 
	status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
	createdBy INTEGER NOT NULL,
	isPublic INTEGER NOT NULL DEFAULT 1,
	allowSpectators INTEGER NOT NULL DEFAULT 1,
	currentRound INTEGER NOT NULL DEFAULT 0,
	winnerId INTEGER,
	createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (winnerId) REFERENCES users(id) ON DELETE SET NULL
); 
CREATE INDEX idx_tournament_tournamentId ON tournament(tournamentId);
CREATE INDEX idx_tournament_status ON tournament(status);
CREATE INDEX idx_tournament_createdBy ON tournament(createdBy);

CREATE TABLE tournament_players (
	id INTEGER PRIMARY KEY,
	tournamentId INTEGER NOT NULL,
	playerId INTEGER NOT NULL,
	playerName TEXT NOT NULL,
	playerIndex INTEGER NOT NULL,
	isOnline INTEGER NOT NULL DEFAULT 1,
	isAI INTEGER NOT NULL DEFAULT 0,
	isEliminated INTEGER NOT NULL DEFAULT 0,
	joinedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	UNIQUE (tournamentId, playerId),
	UNIQUE (tournamentId, playerIndex),
	FOREIGN KEY (tournamentId) REFERENCES tournament(id) ON DELETE CASCADE,
	FOREIGN KEY (playerId) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_tp_tournamentId ON tournament_players(tournamentId);
CREATE INDEX idx_tp_playerId ON tournament_players(playerId);

CREATE TABLE tournament_matches (
	id INTEGER PRIMARY KEY,
	tournamentId INTEGER NOT NULL,
	matchId TEXT NOT NULL,
	round INTEGER NOT NULL,
	matchIndex INTEGER NOT NULL,
	player1Id INTEGER,
	player2Id INTEGER,
	player1Score INTEGER DEFAULT 0,
	player2Score INTEGER DEFAULT 0,
	winnerId INTEGER,
	status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
	gameId INTEGER,
	startedAt TEXT,
	completedAt TEXT,
	UNIQUE (tournamentId, matchId),
	FOREIGN KEY (tournamentId) REFERENCES tournament(id) ON DELETE CASCADE,
	FOREIGN KEY (player1Id) REFERENCES users(id) ON DELETE SET NULL,
	FOREIGN KEY (player2Id) REFERENCES users(id) ON DELETE SET NULL,
	FOREIGN KEY (winnerId) REFERENCES users(id) ON DELETE SET NULL,
	FOREIGN KEY (gameId) REFERENCES game(id) ON DELETE SET NULL
);
CREATE INDEX idx_tm_tournamentId ON tournament_matches(tournamentId);
CREATE INDEX idx_tm_status ON tournament_matches(status); 
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