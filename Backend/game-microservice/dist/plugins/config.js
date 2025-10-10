"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configPlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const dotenv_1 = __importDefault(require("dotenv"));
exports.configPlugin = (0, fastify_plugin_1.default)(async (app) => {
    dotenv_1.default.config();
    const cfg = {
        NODE_ENV: process.env.NODE_ENV ?? 'development',
        DB_FILE: process.env.DB_FILE ?? './data/game_management.db',
        PORT: Number(process.env.PORT ?? 3000),
    };
    app.decorate('config', cfg);
});
//# sourceMappingURL=config.js.map