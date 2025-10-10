"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateGamePlayerBody = exports.CreateGamePlayerReply = exports.CreateGamePlayerBody = exports.GamePlayer = exports.ErrorResponse = void 0;
const typebox_1 = require("@sinclair/typebox");
exports.ErrorResponse = typebox_1.Type.Object({ error: typebox_1.Type.String() });
exports.GamePlayer = typebox_1.Type.Object({
    id: typebox_1.Type.Number(),
    gameId: typebox_1.Type.Number(),
    playerId: typebox_1.Type.Number(),
    playerScore: typebox_1.Type.Number({ minimum: 0 }),
    createdAt: typebox_1.Type.String(),
    updatedAt: typebox_1.Type.String(),
});
exports.CreateGamePlayerBody = typebox_1.Type.Object({
    gameId: typebox_1.Type.Number(),
    playerId: typebox_1.Type.Number(),
    playerScore: typebox_1.Type.Number({ minimum: 0 }),
});
exports.CreateGamePlayerReply = exports.GamePlayer;
exports.UpdateGamePlayerBody = exports.CreateGamePlayerBody;
//# sourceMappingURL=game_players.schema.js.map