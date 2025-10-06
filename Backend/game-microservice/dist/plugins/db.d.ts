import type BetterSqlite3 from 'better-sqlite3';
export type DB = BetterSqlite3.Database;
export declare const dbPlugin: (app: import("fastify").FastifyInstance<import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>) => Promise<void>;
declare module 'fastify' {
    interface FastifyInstance {
        db: DB;
    }
}
//# sourceMappingURL=db.d.ts.map