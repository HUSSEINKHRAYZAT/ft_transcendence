-- Clean Tournament Bracket System - Database Schema
-- Drop old tables if they exist and create new clean structure

-- Drop existing tables (if any)
DROP TABLE IF EXISTS tournament_matches;
DROP TABLE IF EXISTS tournament_players;
DROP TABLE IF EXISTS tournaments;

-- Main tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,                    -- 6-character code (e.g., "ABC123")
  name TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size IN (4, 8, 16)),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  current_round INTEGER DEFAULT 1,
  winner_id TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Players in tournament
CREATE TABLE IF NOT EXISTS tournament_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  seed INTEGER NOT NULL,                        -- 1 to size (determines initial placement)
  is_eliminated BOOLEAN DEFAULT 0,
  placement INTEGER,                            -- Final placement (1 = winner, 2 = runner-up, etc.)
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  UNIQUE(tournament_id, user_id)                -- Prevent duplicate entries
);

-- Matches in bracket
CREATE TABLE IF NOT EXISTS tournament_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  round INTEGER NOT NULL,                       -- 1, 2, 3, 4
  match_number INTEGER NOT NULL,                -- Position in round (0-indexed)
  player1_id TEXT,                              -- NULL until both prerequisites complete
  player2_id TEXT,                              -- NULL until both prerequisites complete
  winner_id TEXT,
  score_player1 INTEGER DEFAULT 0,
  score_player2 INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'active', 'completed')),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  UNIQUE(tournament_id, round, match_number)    -- Unique match per round
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournaments_code ON tournaments(code);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament ON tournament_players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_user ON tournament_players(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_status ON tournament_matches(status);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON tournament_matches(tournament_id, round);

-- Sample data for testing (4-player tournament)
INSERT INTO tournaments (code, name, size, status, current_round, created_by) 
VALUES ('TEST01', 'Test Tournament', 4, 'waiting', 1, 'admin');

INSERT INTO tournament_players (tournament_id, user_id, username, seed, is_eliminated) 
VALUES 
  (1, 'player1', 'Alice', 1, 0),
  (1, 'player2', 'Bob', 2, 0),
  (1, 'player3', 'Carol', 3, 0),
  (1, 'player4', 'Dave', 4, 0);

-- Success message
SELECT 'Clean Tournament Bracket Database Schema Created Successfully! ✅' as message;
