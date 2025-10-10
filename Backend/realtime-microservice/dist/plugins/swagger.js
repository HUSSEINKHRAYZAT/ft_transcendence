"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSwagger = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
exports.registerSwagger = (0, fastify_plugin_1.default)(async (fastify) => {
    await fastify.register(swagger_1.default, {
        openapi: {
            info: {
                title: 'Realtime Microservice',
                description: 'Fastify REST + WebSocket API',
                version: '1.0.0'
            },
            tags: [
                { name: 'health', description: 'Health checks' },
                { name: 'ws-events', description: 'WebSocket messages (documented as JSON)' }
            ],
            components: {
                schemas: {
                    HealthResponse: {
                        type: 'object',
                        properties: {
                            status: { type: 'string' },
                            message: { type: 'string' },
                            timestamp: { type: 'string', format: 'date-time' },
                            rooms: { type: 'number' },
                            connectedPlayers: { type: 'number' }
                        }
                    }
                }
            }
        }
    });
    await fastify.register(swagger_ui_1.default, {
        routePrefix: '/docs',
        staticCSP: true
    });
    fastify.get('/ws/events', {
        schema: {
            tags: ['ws-events'],
            summary: 'List supported WebSocket messages'
        }
    }, async () => ({
        clientToServer: [
            'register_player',
            'create_room',
            'join_room',
            'leave_room',
            'start_game',
            'game_state',
            'player_input',
            'chat_message'
        ],
        serverToClient: [
            'registered',
            'error',
            'room_created',
            'room_joined',
            'room_updated',
            'player_joined',
            'player_left',
            'game_ready',
            'game_started',
            'game_state',
            'game_exit',
            'chat_message',
            'server_shutdown'
        ],
        messageFormat: 'JSON { "type": "<event>", ...payload }'
    }));
});
//# sourceMappingURL=swagger.js.map