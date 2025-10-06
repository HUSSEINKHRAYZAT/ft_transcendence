"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typebox_1 = require("@sinclair/typebox");
const game_players_service_1 = require("../services/game_players.service");
const game_players_schema_1 = require("../schemas/game_players.schema");
const plugin = async (app) => {
    const svc = (0, game_players_service_1.gamePlayersService)(app);
    app.post("/", {
        schema: {
            tags: ["game_players"],
            body: game_players_schema_1.CreateGamePlayerBody,
            response: { 201: game_players_schema_1.CreateGamePlayerReply, 500: game_players_schema_1.ErrorResponse },
            summary: "Create game player",
        },
    }, async (req, reply) => {
        const body = req.body;
        try {
            const newId = svc.createGamePlayer(body);
            const created = svc.getGamePlayerById(newId);
            return reply.status(201).send(created);
        }
        catch (e) {
            return reply.status(500).send({ error: e });
        }
    });
    app.get("/:id", {
        schema: {
            tags: ["game_players"],
            params: typebox_1.Type.Object({ id: typebox_1.Type.Number() }),
            response: { 200: game_players_schema_1.CreateGamePlayerReply, 404: game_players_schema_1.ErrorResponse },
            summary: "Get a game player by id",
        },
    }, async (req, reply) => {
        const { id } = req.params;
        const gamePlayer = svc.getGamePlayerById(Number(id));
        if (!gamePlayer)
            return reply.status(404).send({ error: "game player not found" });
        return gamePlayer;
    });
    app.get("/game/:gameId", {
        schema: {
            tags: ["game_players"],
            params: typebox_1.Type.Object({ gameId: typebox_1.Type.Number() }),
            response: { 200: typebox_1.Type.Array(game_players_schema_1.CreateGamePlayerReply), 404: game_players_schema_1.ErrorResponse },
            summary: "Get all game players by gameId",
        },
    }, async (req, reply) => {
        const { gameId } = req.params;
        const gamePlayers = svc.getGamePlayersByGameId(Number(gameId));
        if (!gamePlayers || gamePlayers.length === 0)
            return reply.status(404).send({ error: "no game players found for this gameId" });
        return gamePlayers;
    });
    app.delete("/:id", {
        schema: {
            tags: ["game_players"],
            params: typebox_1.Type.Object({ id: typebox_1.Type.Number() }),
            response: { 204: typebox_1.Type.Null(), 404: game_players_schema_1.ErrorResponse },
            summary: "Delete a game player by id",
        },
    }, async (req, reply) => {
        const { id } = req.params;
        const deleted = svc.deleteGamePlayer(Number(id));
        if (deleted === 0)
            return reply.status(404).send({ error: "game player not found" });
        return reply.status(204).send();
    });
    app.patch("/:id", {
        schema: {
            tags: ["game_players"],
            params: typebox_1.Type.Object({ id: typebox_1.Type.Number() }),
            body: game_players_schema_1.UpdateGamePlayerBody,
            response: { 200: game_players_schema_1.CreateGamePlayerReply, 404: game_players_schema_1.ErrorResponse, 500: game_players_schema_1.ErrorResponse },
            summary: "Update a game player by id",
        },
    }, async (req, reply) => {
        const { id } = req.params;
        const body = req.body;
        try {
            const updated = svc.updateGamePlayer(Number(id), body);
            if (updated === 0)
                return reply.status(404).send({ error: "game player not found" });
            const gamePlayer = svc.getGamePlayerById(Number(id));
            return reply.status(200).send(gamePlayer);
        }
        catch (e) {
            return reply.status(500).send({ error: e });
        }
    });
};
exports.default = plugin;
//# sourceMappingURL=game_players.controller.js.map