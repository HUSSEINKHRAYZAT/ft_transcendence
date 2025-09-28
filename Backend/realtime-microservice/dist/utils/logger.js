"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logger = {
    info: (msg, ...args) => console.log('ℹ️', msg, ...args),
    warn: (msg, ...args) => console.warn('⚠️', msg, ...args),
    error: (msg, ...args) => console.error('❌', msg, ...args)
};
//# sourceMappingURL=logger.js.map