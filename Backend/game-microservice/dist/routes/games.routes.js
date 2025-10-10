"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const games_controller_1 = __importDefault(require("../controllers/games.controller"));
const routes = async (app) => {
    await app.register(games_controller_1.default);
};
exports.default = routes;
//# sourceMappingURL=games.routes.js.map