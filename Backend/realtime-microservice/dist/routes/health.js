"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = void 0;
const healthRoutes = async (fastify) => {
    fastify.get('/api/health', {
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        service: { type: 'string' },
                        timestamp: { type: 'string' }
                    }
                }
            }
        }
    }, async () => {
        return {
            status: 'OK',
            service: 'realtime_microservice',
            timestamp: new Date().toISOString()
        };
    });
};
exports.healthRoutes = healthRoutes;
//# sourceMappingURL=health.js.map