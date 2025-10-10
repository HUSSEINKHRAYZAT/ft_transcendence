"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateGameBody = exports.CreateGameReply = exports.CreateGameBody = exports.Game = exports.ErrorResponse = void 0;
const typebox_1 = require("@sinclair/typebox");
exports.ErrorResponse = typebox_1.Type.Object({ error: typebox_1.Type.String() });
exports.Game = typebox_1.Type.Object({
    id: typebox_1.Type.Number(),
    tournamentId: typebox_1.Type.Optional(typebox_1.Type.Number()),
    createdAt: typebox_1.Type.String(),
});
exports.CreateGameBody = typebox_1.Type.Object({
    tournamentId: typebox_1.Type.Optional(typebox_1.Type.Number()),
});
exports.CreateGameReply = exports.Game;
exports.UpdateGameBody = exports.CreateGameBody;
//# sourceMappingURL=games.schema.js.map