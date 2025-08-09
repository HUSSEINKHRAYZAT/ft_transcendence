import sqlite3 from "sqlite3";

export const db = new sqlite3.Database("database.db", (err) => {
  if (err) console.error("DB Error:", err.message);
  else console.log("Connected to SQLite");
});

db.serialize(() => {
  
  db.run(`CREATE TABLE IF NOT EXISTS User (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    FirstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    isVerified INTEGER DEFAULT 0,
    profilepath TEXT DEFAULT '/default.jpg',
    status TEXT DEFAULT 'offline',
    isLoggedIn INTEGER DEFAULT 0,
    enable2fa INTEGER DEFAULT 0,
    updatedAt TEXT  NOT NULL,
    createdAt TEXT  NOT NULL
  )`);
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email_unique
          ON User(lower(email))`);
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_username_unique
          ON User(lower(username))`);
  db.run(`CREATE TABLE IF NOT EXISTS tournament (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT  NOT NULL,
    NumOfplayers INTEGER NOT NULL,
    createdAt TEXT  NOT NULL,
    updatedAt TEXT  NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    countwin INTEGER NOT NULL,
    countloss INTEGER NOT NULL,
    total INTEGER NOT NULL,
    updatedAt TEXT  NOT NULL,
    createdAt TEXT  NOT NULL,
    tourmenetId INTEGER NOT NULL,
    FOREIGN KEY(userId) REFERENCES User(id),
    FOREIGN KEY(tourmenetId) REFERENCES tournament(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS game (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    createdat TEXT  NOT NULL,
    Intourmenent INTEGER NOT NULL,
    tournementId INTEGER NOT NULL,
    FOREIGN KEY(tournementId) REFERENCES tournament(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code INTEGER NOT NULL,
    createdAt TEXT  NOT NULL,
    type TEXT  NOT NULL,
    name TEXT  NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS game_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gameId INTEGER NOT NULL,
    playedId INTEGER NOT NULL,
    playerscore INTEGER NOT NULL,
    createdAt TEXT  NOT NULL,
    updatedAt TEXT  NOT NULL,
    FOREIGN KEY(gameId) REFERENCES game(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS friendship (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requesterId INTEGER NOT NULL,
    addresseeId INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending','accepted','blocked')) DEFAULT 'pending',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    UNIQUE(requesterId, addresseeId),
    FOREIGN KEY(requesterId) REFERENCES User(id),
    FOREIGN KEY(addresseeId) REFERENCES User(id)
  )`);

  console.log("✅ All tables created.");
});