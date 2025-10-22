import type { FastifyInstance } from 'fastify';

export type SettingsRow = {
  id: number;
  username: string;
  languageCode: string;
  accentColor: string;
  backgroundTheme: string;
};

export function settingsService(app: FastifyInstance)
{
    const db = app.db;

    function getByUsername(username: string): SettingsRow | undefined {
      return db
        .prepare(`SELECT id, username, languageCode, accentColor, backgroundTheme
                  FROM settings WHERE username = ?`)
        .get(username) as SettingsRow | undefined;
    }
    function upsertFromStrings(input: {
        username: string;
        languageCode?: string;
        accentColor?: string;
        backgroundTheme?: string;
      }): SettingsRow {
        const username = String(input.username || '').trim();
        if (!username) throw new Error('username is required');

        const languageCode = input.languageCode?.trim();
        const accentColor = input.accentColor?.trim();
        const backgroundTheme = input.backgroundTheme?.trim();

        const existing = getByUsername(username);

        if (!existing) {
          const stmt = db.prepare(`
            INSERT INTO settings (username, languageCode, accentColor, backgroundTheme, createdAt, updatedAt)
            VALUES (
              @username,
              COALESCE(@languageCode, 'eng'),
              COALESCE(@accentColor, 'lime'),
              COALESCE(@backgroundTheme, 'dark'),
              datetime('now'), datetime('now')
            )
          `);
          const info = stmt.run({ username, languageCode, accentColor, backgroundTheme });

          return db
            .prepare(`SELECT id, username, languageCode, accentColor, backgroundTheme FROM settings WHERE id = ?`)
            .get(info.lastInsertRowid) as SettingsRow;
        }

        db.prepare(`
          UPDATE settings
          SET
            languageCode = COALESCE(@languageCode, languageCode),
            accentColor = COALESCE(@accentColor, accentColor),
            backgroundTheme = COALESCE(@backgroundTheme, backgroundTheme),
            updatedAt = datetime('now')
          WHERE username = @username
        `).run({ username, languageCode, accentColor, backgroundTheme });

        return getByUsername(username)!;
      }
    function listLanguages()
    {
        return db
        .prepare(`SELECT code, name FROM languages ORDER BY code`)
        .all() as Array<{ code: string; name: string}>;
    }
    // function deleteByUsername(username: string): boolean {
    //   const stmt = db.prepare(`DELETE FROM settings WHERE username = ?`);
    //   const result = stmt.run(username);
    //   return result.changes > 0; // true if a row was deleted
    // }
    // return { getByUsername, upsertFromStrings, listLanguages , deleteByUsername};
    return { getByUsername, upsertFromStrings, listLanguages};
}