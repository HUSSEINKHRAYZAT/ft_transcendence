"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const game_players_controller_1 = __importDefault(require("../controllers/game_players.controller"));
const routes = async (app) => {
    await app.register(game_players_controller_1.default);
};
exports.default = routes;
//# sourceMappingURL=game_players.routes.js.map