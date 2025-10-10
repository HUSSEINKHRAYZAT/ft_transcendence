"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateTournamentBody = exports.TournamentListReply = exports.CreateTournamentReply = exports.UpdateMatchBody = exports.StartTournamentBody = exports.JoinTournamentBody = exports.CreateTournamentBody = exports.Tournament = exports.TournamentMatch = exports.TournamentPlayer = exports.ErrorResponse = void 0;
const typebox_1 = require("@sinclair/typebox");
exports.ErrorResponse = typebox_1.Type.Object({ error: typebox_1.Type.String() });
exports.TournamentPlayer = typebox_1.Type.Object({
    id: typebox_1.Type.String(),
    name: typebox_1.Type.String(),
    isOnline: typebox_1.Type.Boolean(),
    isAI: typebox_1.Type.Boolean(),
    isEliminated: typebox_1.Type.Optional(typebox_1.Type.Boolean()),
});
exports.TournamentMatch = typebox_1.Type.Object({
    id: typebox_1.Type.String(),
    round: typebox_1.Type.Number(),
    matchIndex: typebox_1.Type.Number(),
    player1: typebox_1.Type.Union([exports.TournamentPlayer, typebox_1.Type.Null()]),
    player2: typebox_1.Type.Union([exports.TournamentPlayer, typebox_1.Type.Null()]),
    winner: typebox_1.Type.Union([exports.TournamentPlayer, typebox_1.Type.Null()]),
    score: typebox_1.Type.Optional(typebox_1.Type.Tuple([typebox_1.Type.Number(), typebox_1.Type.Number()])),
    status: typebox_1.Type.Union([typebox_1.Type.Literal('pending'), typebox_1.Type.Literal('active'), typebox_1.Type.Literal('completed')]),
    gameId: typebox_1.Type.Optional(typebox_1.Type.Union([typebox_1.Type.String(), typebox_1.Type.Null()])),
});
exports.Tournament = typebox_1.Type.Object({
    id: typebox_1.Type.Optional(typebox_1.Type.Number()),
    tournamentId: typebox_1.Type.String(),
    name: typebox_1.Type.String(),
    size: typebox_1.Type.Number({ minimum: 4 }),
    nbOfPlayers: typebox_1.Type.Number({ minimum: 2 }),
    status: typebox_1.Type.Union([typebox_1.Type.Literal('waiting'), typebox_1.Type.Literal('active'), typebox_1.Type.Literal('completed')]),
    createdBy: typebox_1.Type.String(),
    createdByName: typebox_1.Type.Optional(typebox_1.Type.String()),
    isPublic: typebox_1.Type.Boolean(),
    allowSpectators: typebox_1.Type.Boolean(),
    currentRound: typebox_1.Type.Number(),
    players: typebox_1.Type.Array(exports.TournamentPlayer),
    matches: typebox_1.Type.Optional(typebox_1.Type.Array(exports.TournamentMatch)),
    winnerId: typebox_1.Type.Optional(typebox_1.Type.Union([typebox_1.Type.String(), typebox_1.Type.Null()])),
    isComplete: typebox_1.Type.Optional(typebox_1.Type.Boolean()),
    createdAt: typebox_1.Type.String(),
    updatedAt: typebox_1.Type.Optional(typebox_1.Type.String()),
});
exports.CreateTournamentBody = typebox_1.Type.Object({
    name: typebox_1.Type.String({ minLength: 1, maxLength: 100 }),
    size: typebox_1.Type.Union([typebox_1.Type.Literal(4), typebox_1.Type.Literal(8), typebox_1.Type.Literal(16)]),
    isPublic: typebox_1.Type.Boolean(),
    allowSpectators: typebox_1.Type.Boolean(),
    createdBy: typebox_1.Type.String(),
    createdByName: typebox_1.Type.String(),
});
exports.JoinTournamentBody = typebox_1.Type.Object({
    tournamentId: typebox_1.Type.String(),
    playerId: typebox_1.Type.String(),
    playerName: typebox_1.Type.String(),
});
exports.StartTournamentBody = typebox_1.Type.Object({
    tournamentId: typebox_1.Type.String(),
});
exports.UpdateMatchBody = typebox_1.Type.Object({
    matchId: typebox_1.Type.String(),
    player1Score: typebox_1.Type.Optional(typebox_1.Type.Number()),
    player2Score: typebox_1.Type.Optional(typebox_1.Type.Number()),
    winnerId: typebox_1.Type.Optional(typebox_1.Type.String()),
    status: typebox_1.Type.Optional(typebox_1.Type.Union([typebox_1.Type.Literal('pending'), typebox_1.Type.Literal('active'), typebox_1.Type.Literal('completed')])),
});
exports.CreateTournamentReply = exports.Tournament;
exports.TournamentListReply = typebox_1.Type.Array(exports.Tournament);
exports.UpdateTournamentBody = typebox_1.Type.Object({
    status: typebox_1.Type.Optional(typebox_1.Type.Union([typebox_1.Type.Literal('waiting'), typebox_1.Type.Literal('active'), typebox_1.Type.Literal('completed')])),
    currentRound: typebox_1.Type.Optional(typebox_1.Type.Number()),
});
//# sourceMappingURL=tournaments.schema.js.map