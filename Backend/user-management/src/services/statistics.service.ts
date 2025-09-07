import type { FastifyInstance } from 'fastify';

export function statisticsService(app: FastifyInstance) {
  const db = app.db;

  function getByUserId(userId: number) {
    return db.prepare('SELECT * FROM statistics_view WHERE userId = ?').get(userId);
  }

  function patchByUserId(userId: number, d: {
    winDelta?: number; lossDelta?: number; tWinDelta?: number; tCountDelta?: number;
  }) {
    const now = new Date().toISOString();
    const stmt = db.prepare(`UPDATE statistics SET\
      winCount = winCount + @winDelta,\
      lossCount = lossCount + @lossDelta,\
      tournamentWinCount = tournamentWinCount + @tWinDelta,\
      tournamentCount = tournamentCount + @tCountDelta,\
      updatedAt = @now\
      WHERE userId = @userId`);

    const params = {
      winDelta: d.winDelta ?? 0,
      lossDelta: d.lossDelta ?? 0,
      tWinDelta: d.tWinDelta ?? 0,
      tCountDelta: d.tCountDelta ?? 0,
      now,
      userId,
    };

    const res = stmt.run(params);
    return res.changes;
  }

  function listStats(limit = 50, offset = 0) {
    return db
      .prepare(`SELECT * FROM statistics_view ORDER BY id LIMIT ? OFFSET ?`)
      .all(limit, offset) as any[];
  }

  return { getByUserId, patchByUserId, listStats };
}