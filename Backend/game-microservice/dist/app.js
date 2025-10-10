"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const config_1 = require("./plugins/config");
const db_1 = require("./plugins/db");
const swagger_1 = require("./plugins/swagger");
const game_players_routes_1 = __importDefault(require("./routes/game_players.routes"));
const games_routes_1 = __importDefault(require("./routes/games.routes"));
const tournaments_routes_1 = __importDefault(require("./routes/tournaments.routes"));
async function buildApp() {
    const app = (0, fastify_1.default)({
        logger: true,
    });
    await app.register(config_1.configPlugin);
    await app.register(db_1.dbPlugin);
    await app.register(swagger_1.swaggerPlugin);
    await app.register(game_players_routes_1.default, { prefix: '/game_players' });
    await app.register(games_routes_1.default, { prefix: '/games' });
    await app.register(tournaments_routes_1.default, { prefix: '/tournaments' });
    app.get('/health', async () => ({ status: 'ok' }));
    return app;
}
//# sourceMappingURL=app.js.map