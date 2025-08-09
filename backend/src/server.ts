import Fastify from "fastify";
import cors from "@fastify/cors";
import crypto from "crypto";
import { db } from "./db";

const PEPPER = process.env.PASSWORD_PEPPER || "dev-pepper";

function hashPassword(password: string): string {
  // "sha256"
  return crypto.createHash("sha256").update(password + PEPPER).digest("hex");
}

const start = async () => {
  const app = Fastify({ logger: true });

  // Register CORS to allow frontend access
  await app.register(cors, {
    origin: "*", // You can restrict to your frontend domain
  });

  // GET /users
// GET /users
app.get("/users", (request, reply) => {
  const q = `
    SELECT
      id, FirstName, lastName, username, email,password,
      profilepath, status, isVerified, isLoggedIn,
      enable2fa, createdAt, updatedAt
    FROM User
    ORDER BY id ASC
  `;

  db.all(q, [], (err, rows) => {
    if (err) {
      request.log.error({ err }, "DB error on GET /users");
      return reply.code(500).type("application/json").send({ error: "Database error" });
    }
    return reply.type("application/json").send(rows);
  });
});



  // SIGNUP /users
  app.post("/users", (req, reply) => {
    const b = req.body as any;

    // Normalize + trim
    const FirstName   = String(b.firstName ?? b.FirstName ?? "DefaultFirst").trim();
    const lastName    = String(b.lastName ?? "DefaultLast").trim();
    const usernameRaw = String(b.username ?? "DefaultUsername").trim();
    const emailRaw    = String(b.email ?? "no-email@example.com").trim();
    const password    = String(b.password ?? "defaultPass");
    const passwordHashed = hashPassword(password);
    const usernameLower = usernameRaw.toLowerCase();
    const emailLower    = emailRaw.toLowerCase();

    const isVerified  = b.isVerified ?? 0;
    const profilepath = b.profilepath ?? "/default.jpg";
    const status      = b.status ?? "offline";
    const isLoggedIn  = b.isLoggedIn ?? 0;
    const enable2fa   = b.enable2fa ?? 0;
    const createdAt   = b.createdAt ?? new Date().toISOString();
    const updatedAt   = b.updatedAt ?? new Date().toISOString();

    // 1) Pre-check for conflicts (case-insensitive)
    const conflictQ = `
      SELECT id, username, email
      FROM User
      WHERE lower(email) = ? OR lower(username) = ?
      LIMIT 1
    `;

    type ConflictRow = { id: number; username: string; email: string } | undefined;

    db.get<ConflictRow>(conflictQ, [emailLower, usernameLower], (conflictErr, conflictRow) => {
      if (conflictErr) {
        console.error("❌ Conflict check error:", conflictErr.message);
        return reply.code(500).send({ error: "Database error" });
      }

      if (conflictRow) {
        const isEmailConflict = (conflictRow.email ?? "").toLowerCase() === emailLower;
        if (isEmailConflict) {
          return reply.code(409).type("application/json").send({
            error: "Email is already registered.",
            conflict: "email",
          });
        }

        // Username conflict: suggest a few alternatives
        const base = usernameRaw.replace(/[^a-zA-Z0-9_]/g, "");
        const likeQ = `SELECT username FROM User WHERE username LIKE ? LIMIT 20`;

        type LikeRow = { username: string };

        db.all<LikeRow>(likeQ, [`${base}%`], (likeErr, likeRows) => {
          if (likeErr) {
            // If suggestion fetch fails, still return conflict
            return reply.code(409).type("application/json").send({
              error: "Username is already taken.",
              conflict: "username",
            });
          }

          const taken = new Set(
            (likeRows || []).map((r) => String(r.username).toLowerCase())
          );

          const candidates = [
            `${base}${Math.floor(Math.random() * 90 + 10)}`,
            `${base}_${Math.floor(Math.random() * 900 + 100)}`,
            `${base}${new Date().getFullYear()}`,
            `${base}_1`,
            `${base}_01`,
            `${base}_pro`,
            `${base}_dev`,
          ];

          const suggestions: string[] = [];
          for (const c of candidates) {
            if (!taken.has(c.toLowerCase())) suggestions.push(c);
            if (suggestions.length >= 5) break;
          }

          return reply.code(409).type("application/json").send({
            error: "Username is already taken.",
            conflict: "username",
            suggestions,
          });
        });

        return; // stop here; response sent in the db.all callback above
      }

      // 2) No conflicts → insert
      const q = `INSERT INTO User (
        FirstName, lastName, username, email, password,
        isVerified, profilepath, status,
        isLoggedIn, enable2fa, updatedAt, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const v = [
        FirstName,
        lastName,
        usernameRaw,
        emailRaw,
        passwordHashed,
        isVerified,
        profilepath,
        status,
        isLoggedIn,
        enable2fa,
        updatedAt,
        createdAt,
      ];

      db.run(q, v, function (err) {
        if (err) {
          // If you created unique indexes on lower(email)/lower(username), map those errors:
          const msg = (err.message || "").toLowerCase();
          if (msg.includes("idx_user_email_unique")) {
            return reply.code(409).type("application/json").send({
              error: "Email is already registered.",
              conflict: "email",
            });
          }
          if (msg.includes("idx_user_username_unique")) {
            return reply.code(409).type("application/json").send({
              error: "Username is already taken.",
              conflict: "username",
            });
          }

          console.error("❌ Insert Error:", err.message);
          return reply.code(500).type("application/json").send({ error: err.message });
        }

        const user = {
          id: this.lastID,
          FirstName,
          lastName,
          username: usernameRaw,
          email: emailRaw,
          isVerified,
          profilepath,
          status,
          isLoggedIn,
          enable2fa,
          createdAt,
          updatedAt,
        };

        const token = "mock-jwt-token-" + Date.now();

        return reply
          .type("application/json")
          .code(201)
          .send({ user, token });
      });
    });
  });

  // LOGIN /login
  app.post("/login", (req, reply) => {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      return reply.code(400).send({ error: "Email and password are required" });
    }

    const q = `SELECT * FROM User WHERE email = ? LIMIT 1`;

    type UserRow = {
      id: number;
      FirstName: string;
      lastName: string;
      username: string;
      email: string;
      password: string;
      isVerified: number;
      profilepath: string;
      status: string;
      isLoggedIn: number;
      enable2fa: number;
      createdAt: string;
      updatedAt: string;
    };

    db.get<UserRow>(q, [email], (err, row) => {
      if (err) {
        console.error("❌ DB Error:", err.message);
        return reply.code(500).send({ error: "Database error" });
      }

      if (!row) {
        return reply.code(401).send({ error: "Invalid email or password" });
      }
      const candidate = hashPassword(password);
      if (row.password !== candidate) {
        return reply.code(401).send({ error: "Invalid email or password" });
      }

      const token = "mock-jwt-token-" + Date.now();

      return reply.code(200).send({
        user: {
          id: row.id,
          FirstName: row.FirstName,
          lastName: row.lastName,
          username: row.username,
          email: row.email,
          isVerified: row.isVerified,
          profilepath: row.profilepath,
          status: row.status,
          isLoggedIn: row.isLoggedIn,
          enable2fa: row.enable2fa,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
        token,
      });
    });
  });

  // TOURNAMENT ROUTES
  app.get("/tournaments", (_, reply) => {
    db.all("SELECT * FROM tournament", [], (err, rows) => {
      if (err) return reply.code(500).send({ error: err.message });
      reply.send(rows);
    });
  });

  app.post("/tournaments", (req, reply) => {
    const b = req.body as any;
    const q = `INSERT INTO tournament (Name, NumOfplayers, createdAt, updatedAt) VALUES (?, ?, ?, ?)`;
    const v = [b.Name, b.NumOfplayers, b.createdAt, b.updatedAt];
    db.run(q, v, function (err) {
      if (err) return reply.code(500).send({ error: err.message });
      reply.send({ id: this.lastID });
    });
  });

  // STATISTICS ROUTES
  app.get("/statistics", (_, reply) => {
    db.all("SELECT * FROM statistics", [], (err, rows) => {
      if (err) return reply.code(500).send({ error: err.message });
      reply.send(rows);
    });
  });

  app.post("/statistics", (req, reply) => {
    const b = req.body as any;
    const q = `INSERT INTO statistics (userId, countwin, countloss, total, updatedAt, createdAt, tourmenetId) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const v = [b.userId, b.countwin, b.countloss, b.total, b.updatedAt, b.createdAt, b.tourmenetId];
    db.run(q, v, function (err) {
      if (err) return reply.code(500).send({ error: err.message });
      reply.send({ id: this.lastID });
    });
  });

  // GAME ROUTES
  app.get("/games", (_, reply) => {
    db.all("SELECT * FROM game", [], (err, rows) => {
      if (err) return reply.code(500).send({ error: err.message });
      reply.send(rows);
    });
  });

  app.post("/games", (req, reply) => {
    const b = req.body as any;
    const q = `INSERT INTO game (createdat, Intourmenent, tournementId) VALUES (?, ?, ?)`;
    const v = [b.createdat, b.Intourmenent, b.tournementId];
    db.run(q, v, function (err) {
      if (err) return reply.code(500).send({ error: err.message });
      reply.send({ id: this.lastID });
    });
  });

  // SESSION ROUTES
  app.get("/sessions", (_, reply) => {
    db.all("SELECT * FROM session", [], (err, rows) => {
      if (err) return reply.code(500).send({ error: err.message });
      reply.send(rows);
    });
  });

  app.post("/sessions", (req, reply) => {
    const b = req.body as any;
    const q = `INSERT INTO session (code, createdAt, type, name) VALUES (?, ?, ?, ?)`;
    const v = [b.code, b.createdAt, b.type, b.name];
    db.run(q, v, function (err) {
      if (err) return reply.code(500).send({ error: err.message });
      reply.send({ id: this.lastID });
    });
  });

  // GAME PLAYERS ROUTES
  app.get("/game-players", (_, reply) => {
    db.all("SELECT * FROM game_players", [], (err, rows) => {
      if (err) return reply.code(500).send({ error: err.message });
      reply.send(rows);
    });
  });

  app.post("/game-players", (req, reply) => {
    const b = req.body as any;
    const q = `INSERT INTO game_players (gameId, playedId, playerscore, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`;
    const v = [b.gameId, b.playedId, b.playerscore, b.createdAt, b.updatedAt];
    db.run(q, v, function (err) {
      if (err) return reply.code(500).send({ error: err.message });
      reply.send({ id: this.lastID });
    });
  });

  // START SERVER
  app.listen({ port: 3000 }, () => {
    console.log("🚀 Server running at http://localhost:3000");
  });
};

start();