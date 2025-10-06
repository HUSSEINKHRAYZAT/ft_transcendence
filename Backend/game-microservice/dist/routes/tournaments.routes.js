"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tournaments_controller_1 = __importDefault(require("../controllers/tournaments.controller"));
const routes = async (app) => {
    await app.register(tournaments_controller_1.default);
};
exports.default = routes;
//# sourceMappingURL=tournaments.routes.js.map