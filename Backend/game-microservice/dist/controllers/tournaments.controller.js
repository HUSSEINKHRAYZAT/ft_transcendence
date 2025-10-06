"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typebox_1 = require("@sinclair/typebox");
const tournaments_service_1 = require("../services/tournaments.service");
const tournaments_schema_1 = require("../schemas/tournaments.schema");
const plugin = async (app) => {
    const svc = (0, tournaments_service_1.tournamentsService)(app);
    // Create tournament
    app.post("/", {
        schema: {
            tags: ["tournaments"],
            body: tournaments_schema_1.CreateTournamentBody,
            response: {
                201: tournaments_schema_1.Tournament,
                409: tournaments_schema_1.ErrorResponse,
                500: tournaments_schema_1.ErrorResponse,
            },
            summary: "Create tournament",
        },
    }, async (req, reply) => {
        const body = req.body;
        try {
            const created = svc.createTournament(body);
            return reply.status(201).send(created);
        }
        catch (e) {
            return reply.status(500).send({ error: e.message || 'Failed to create tournament' });
        }
    });
    // Get all tournaments
    app.get("/", {
        schema: {
            tags: ["tournaments"],
            response: { 200: typebox_1.Type.Array(tournaments_schema_1.Tournament), 500: tournaments_schema_1.ErrorResponse },
            summary: "Get all active tournaments",
        },
    }, async (req, reply) => {
        try {
            const tournaments = svc.getAllTournaments();
            return tournaments;
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    });
    // Get tournament by ID
    app.get("/:id", {
        schema: {
            tags: ["tournaments"],
            params: typebox_1.Type.Object({ id: typebox_1.Type.Number() }),
            response: { 200: tournaments_schema_1.Tournament, 404: tournaments_schema_1.ErrorResponse },
            summary: "Get a tournament by database ID",
        },
    }, async (req, reply) => {
        const { id } = req.params;
        const tournament = svc.getTournamentById(Number(id));
        if (!tournament)
            return reply.status(404).send({ error: "tournament not found" });
        return tournament;
    });
    // Get tournament by code
    app.get("/code/:code", {
        schema: {
            tags: ["tournaments"],
            params: typebox_1.Type.Object({ code: typebox_1.Type.String({ minLength: 6, maxLength: 6 }) }),
            response: { 200: tournaments_schema_1.Tournament, 404: tournaments_schema_1.ErrorResponse },
            summary: "Get a tournament by 6-character code",
        },
    }, async (req, reply) => {
        const { code } = req.params;
        const tournament = svc.getTournamentByCode(code.toUpperCase());
        if (!tournament)
            return reply.status(404).send({ error: "tournament not found" });
        return tournament;
    });
    // Join tournament
    app.post("/:tournamentId/join", {
        schema: {
            tags: ["tournaments"],
            params: typebox_1.Type.Object({ tournamentId: typebox_1.Type.String() }),
            body: tournaments_schema_1.JoinTournamentBody,
            response: {
                200: tournaments_schema_1.Tournament,
                400: tournaments_schema_1.ErrorResponse,
                404: tournaments_schema_1.ErrorResponse,
                500: tournaments_schema_1.ErrorResponse,
            },
            summary: "Join a tournament",
        },
    }, async (req, reply) => {
        const { tournamentId } = req.params;
        const body = req.body;
        try {
            const updated = svc.joinTournament({
                ...body,
                tournamentId: tournamentId.toUpperCase(),
            });
            return updated;
        }
        catch (e) {
            if (e.message.includes('not found')) {
                return reply.status(404).send({ error: e.message });
            }
            return reply.status(400).send({ error: e.message });
        }
    });
    // Start tournament
    app.post("/:tournamentId/start", {
        schema: {
            tags: ["tournaments"],
            params: typebox_1.Type.Object({ tournamentId: typebox_1.Type.String() }),
            body: tournaments_schema_1.StartTournamentBody,
            response: {
                200: tournaments_schema_1.Tournament,
                400: tournaments_schema_1.ErrorResponse,
                404: tournaments_schema_1.ErrorResponse,
                500: tournaments_schema_1.ErrorResponse,
            },
            summary: "Start a tournament and generate bracket",
        },
    }, async (req, reply) => {
        const { tournamentId } = req.params;
        try {
            const updated = svc.startTournament({
                tournamentId: tournamentId.toUpperCase(),
            });
            return updated;
        }
        catch (e) {
            if (e.message.includes('not found')) {
                return reply.status(404).send({ error: e.message });
            }
            return reply.status(400).send({ error: e.message });
        }
    });
    // Update match result
    app.put("/:tournamentId/matches/:matchId", {
        schema: {
            tags: ["tournaments"],
            params: typebox_1.Type.Object({
                tournamentId: typebox_1.Type.String(),
                matchId: typebox_1.Type.String()
            }),
            body: tournaments_schema_1.UpdateMatchBody,
            response: {
                200: tournaments_schema_1.Tournament,
                404: tournaments_schema_1.ErrorResponse,
                500: tournaments_schema_1.ErrorResponse,
            },
            summary: "Update match result and advance bracket",
        },
    }, async (req, reply) => {
        const { tournamentId, matchId } = req.params;
        const body = req.body;
        try {
            const updated = svc.updateMatch(tournamentId.toUpperCase(), {
                ...body,
                matchId,
            });
            return updated;
        }
        catch (e) {
            if (e.message.includes('not found')) {
                return reply.status(404).send({ error: e.message });
            }
            return reply.status(500).send({ error: e.message });
        }
    });
    // Delete tournament
    app.delete("/:id", {
        schema: {
            tags: ["tournaments"],
            params: typebox_1.Type.Object({ id: typebox_1.Type.Number() }),
            response: { 204: typebox_1.Type.Null(), 404: tournaments_schema_1.ErrorResponse },
            summary: "Delete a tournament by id",
        },
    }, async (req, reply) => {
        const { id } = req.params;
        const deleted = svc.deleteTournament(Number(id));
        if (deleted === 0)
            return reply.status(404).send({ error: "tournament not found" });
        return reply.status(204).send();
    });
};
exports.default = plugin;
//# sourceMappingURL=tournaments.controller.js.map