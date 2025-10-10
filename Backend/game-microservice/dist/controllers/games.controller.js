"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typebox_1 = require("@sinclair/typebox");
const games_service_1 = require("../services/games.service");
const games_schema_1 = require("../schemas/games.schema");
const plugin = async (app) => {
    const svc = (0, games_service_1.gamesService)(app);
    app.post("/", {
        schema: {
            tags: ["games"],
            body: games_schema_1.CreateGameBody,
            response: { 201: games_schema_1.CreateGameReply, 500: games_schema_1.ErrorResponse },
            summary: "Create game",
        },
    }, async (req, reply) => {
        const body = req.body;
        try {
            const newId = svc.createGame(body);
            const created = svc.getGameById(newId);
            return reply.status(201).send(created);
        }
        catch (e) {
            return reply.status(500).send({ error: e });
        }
    });
    app.get("/:id", {
        schema: {
            tags: ["games"],
            params: typebox_1.Type.Object({ id: typebox_1.Type.Number() }),
            response: { 200: games_schema_1.CreateGameReply, 404: games_schema_1.ErrorResponse },
            summary: "Get a game by id",
        },
    }, async (req, reply) => {
        const { id } = req.params;
        const game = svc.getGameById(Number(id));
        if (!game)
            return reply.status(404).send({ error: "game not found" });
        return game;
    });
    app.get("/tournament/:tournamentId", {
        schema: {
            tags: ["games"],
            params: typebox_1.Type.Object({ tournamentId: typebox_1.Type.Number() }),
            response: { 200: typebox_1.Type.Array(games_schema_1.CreateGameReply), 404: games_schema_1.ErrorResponse },
            summary: "Get all games of a tournament by tournament id",
        },
    }, async (req, reply) => {
        const { tournamentId } = req.params;
        const games = svc.getTournamentGames(Number(tournamentId));
        if (!games || games.length === 0)
            return reply.status(404).send({ error: "no games found" });
        return games;
    });
    app.delete("/:id", {
        schema: {
            tags: ["games"],
            params: typebox_1.Type.Object({ id: typebox_1.Type.Number() }),
            response: { 204: typebox_1.Type.Null(), 404: games_schema_1.ErrorResponse, 500: games_schema_1.ErrorResponse },
            summary: "Delete a game by id",
        },
    }, async (req, reply) => {
        const { id } = req.params;
        try {
            const deleted = svc.deleteGame(Number(id));
            if (deleted === 0)
                return reply.status(404).send({ error: "game not found" });
            return reply.status(204).send();
        }
        catch (e) {
            return reply.status(500).send({ error: e });
        }
    });
};
exports.default = plugin;
//# sourceMappingURL=games.controller.js.map