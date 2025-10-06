"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbPlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const schema_1 = require("../utils/schema");
exports.dbPlugin = (0, fastify_plugin_1.default)(async (app) => {
    const file = app.config.DB_FILE;
    const db = new better_sqlite3_1.default(file);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    try {
        db.exec(schema_1.SCHEMA_SQL);
    }
    catch (e) {
        app.log.error({ err: e }, 'schema migration failed');
        throw e;
    }
    app.decorate('db', db);
    app.addHook('onClose', (instance, done) => {
        try {
            db.close();
            done();
        }
        catch (e) {
            done(e);
        }
    });
});
//# sourceMappingURL=db.js.map