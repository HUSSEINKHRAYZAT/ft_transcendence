"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCors = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const cors_1 = __importDefault(require("@fastify/cors"));
const config_js_1 = require("../config.js");
exports.registerCors = (0, fastify_plugin_1.default)(async (fastify) => {
    await fastify.register(cors_1.default, {
        origin: config_js_1.config.CORS_ORIGIN === '*' ? true : config_js_1.config.CORS_ORIGIN,
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS']
    });
});
//# sourceMappingURL=cors.js.map