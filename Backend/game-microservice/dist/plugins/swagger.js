"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerPlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
exports.swaggerPlugin = (0, fastify_plugin_1.default)(async (app) => {
    await app.register(swagger_1.default, {
        openapi: {
            info: {
                title: 'game-management API',
                description: 'Fastify + TypeScript + SQLite microservice',
                version: '1.0.0',
            },
            servers: [
                { url: '/', description: 'container-internal (compose network)' },
            ],
            tags: [
                { name: 'game_players', description: 'game_players' },
                { name: 'games', description: 'games' },
                { name: 'tournaments', description: 'tournaments' },
            ],
        },
    });
    await app.register(swagger_ui_1.default, {
        routePrefix: '/docs',
        staticCSP: true,
        uiConfig: {
            docExpansion: 'list',
            deepLinking: true,
        },
    });
    app.get('/openapi.json', async () => app.swagger());
});
//# sourceMappingURL=swagger.js.map