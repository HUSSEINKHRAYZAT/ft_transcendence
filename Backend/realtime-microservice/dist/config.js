"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    PORT: 3006,
    HOST: '0.0.0.0',
    CORS_ORIGIN: '*',
    CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
    EMPTY_ROOM_MAX_AGE_MIN: 5, // delete if empty for > 5 minutes
    WS_MAX_MSG_SIZE: 1000000 // 1 MB max inbound message
};
//# sourceMappingURL=config.js.map