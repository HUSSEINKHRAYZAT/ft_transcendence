import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import { tournamentsService } from "../services/tournaments.service";
import {
  CreateTournamentBody,
  CreateTournamentBodyTS,
  CreateTournamentReply,
  ErrorResponse,
  TournamentTS,
} from "../schemas/tournaments.schema";

const plugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  const svc = tournamentsService(app);

  // Get all tournaments
  app.get(
    "/",
    {
      schema: {
        tags: ["tournaments"],
        response: {
          200: Type.Array(CreateTournamentReply),
          500: ErrorResponse,
        },
        summary: "Get all tournaments",
      },
    },
    async (req, reply) => {
      try {
        const tournaments = svc.getAllTournaments();
        return tournaments;
      } catch (e: any) {
        return reply.status(500).send({ error: e.message });
      }
    }
  );

  // Create a new tournament
  app.post(
    "/",
    {
      schema: {
        tags: ["tournaments"],
        body: Type.Object({
          name: Type.String(),
          size: Type.Union([Type.Literal(4), Type.Literal(8), Type.Literal(16)]),
          isPublic: Type.Boolean(),
          allowSpectators: Type.Boolean(),
          createdBy: Type.String(),
        }),
        response: {
          201: Type.Object({
            tournamentId: Type.String(),
            code: Type.String(),
          }),
          500: ErrorResponse,
        },
        summary: "Create tournament",
      },
    },
    async (req, reply) => {
      const body = req.body as any;
      try {
        const tournamentId = svc.createTournament(body);
        
        // Return both tournamentId and code (using tournamentId as code for now)
        return reply.status(201).send({ 
          tournamentId, 
          code: tournamentId, // Using the generated ID as the shareable code
        });
      } catch (e: any) {
        return reply.status(500).send({ error: e.message });
      }
    }
  );

  // Get tournament by ID
  app.get(
    "/:id",
    {
      schema: {
        tags: ["tournaments"],
        params: Type.Object({ id: Type.String() }),
        response: { 200: CreateTournamentReply, 404: ErrorResponse },
        summary: "Get a tournament by id",
      },
    },
    async (req, reply) => {
      const { id } = req.params as any;
      try {
        const tournament = svc.getTournamentById(id);
        if (!tournament)
          return reply.status(404).send({ error: "tournament not found" });
        return tournament;
      } catch (e: any) {
        return reply.status(500).send({ error: e.message });
      }
    }
  );

  // Join tournament
  app.post(
    "/:id/join",
    {
      schema: {
        tags: ["tournaments"],
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          playerId: Type.String(),
          playerName: Type.String(),
        }),
        response: { 200: CreateTournamentReply, 400: ErrorResponse, 404: ErrorResponse },
        summary: "Join a tournament",
      },
    },
    async (req, reply) => {
      const { id } = req.params as any;
      const { playerId, playerName } = req.body as any;
      
      try {
        const tournament = svc.joinTournament(id, { id: playerId, name: playerName, isOnline: true });
        return tournament;
      } catch (e: any) {
        if (e.message.includes("not found")) {
          return reply.status(404).send({ error: e.message });
        }
        return reply.status(400).send({ error: e.message });
      }
    }
  );

  // Join tournament by code
  app.post(
    "/join",
    {
      schema: {
        tags: ["tournaments"],
        body: Type.Object({
          code: Type.String(),
          playerId: Type.String(),
          playerName: Type.String(),
        }),
        response: { 
          200: Type.Object({
            name: Type.Optional(Type.String()),
            currentPlayers: Type.Number(),
            maxPlayers: Type.Number(),
            status: Type.Optional(Type.String())
          }), 
          400: ErrorResponse, 
          404: ErrorResponse 
        },
        summary: "Join a tournament by code",
      },
    },
    async (req, reply) => {
      const { code, playerId, playerName } = req.body as any;
      
      try {
        const tournament = svc.getTournamentByCode(code);
        if (!tournament) {
          return reply.status(404).send({ error: "Tournament not found" });
        }
        
        const updatedTournament = svc.joinTournament(tournament.tournamentId, { 
          id: playerId, 
          name: playerName, 
          isOnline: true 
        });
        
        return {
          name: updatedTournament.name,
          currentPlayers: updatedTournament.players.length,
          maxPlayers: updatedTournament.size,
          status: updatedTournament.status
        };
      } catch (e: any) {
        if (e.message.includes("not found")) {
          return reply.status(404).send({ error: e.message });
        }
        return reply.status(400).send({ error: e.message });
      }
    }
  );

  // Start tournament
  app.post(
    "/:id/start",
    {
      schema: {
        tags: ["tournaments"],
        params: Type.Object({ id: Type.String() }),
        response: { 200: CreateTournamentReply, 400: ErrorResponse, 404: ErrorResponse },
        summary: "Start a tournament",
      },
    },
    async (req, reply) => {
      const { id } = req.params as any;
      
      try {
        const tournament = svc.startTournament(id);
        return tournament;
      } catch (e: any) {
        if (e.message.includes("not found")) {
          return reply.status(404).send({ error: e.message });
        }
        return reply.status(400).send({ error: e.message });
      }
    }
  );

  // Fill tournament with AI players
  app.post(
    "/:id/fill-ai",
    {
      schema: {
        tags: ["tournaments"],
        params: Type.Object({ id: Type.String() }),
        response: { 200: CreateTournamentReply, 400: ErrorResponse, 404: ErrorResponse },
        summary: "Fill tournament with AI players",
      },
    },
    async (req, reply) => {
      const { id } = req.params as any;
      
      try {
        const tournament = svc.fillWithAI(id);
        return tournament;
      } catch (e: any) {
        if (e.message.includes("not found")) {
          return reply.status(404).send({ error: e.message });
        }
        return reply.status(400).send({ error: e.message });
      }
    }
  );

  // Start a specific match
  app.post(
    "/:id/matches/:matchId/start",
    {
      schema: {
        tags: ["tournaments"],
        params: Type.Object({ 
          id: Type.String(),
          matchId: Type.String(),
        }),
        response: { 200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }), 400: ErrorResponse, 404: ErrorResponse },
        summary: "Start a tournament match",
      },
    },
    async (req, reply) => {
      const { id, matchId } = req.params as any;
      
      try {
        const result = svc.startMatch(id, matchId);
        return result;
      } catch (e: any) {
        if (e.message.includes("not found")) {
          return reply.status(404).send({ error: e.message });
        }
        return reply.status(400).send({ error: e.message });
      }
    }
  );

  // Complete a match
  app.post(
    "/:id/matches/:matchId/complete",
    {
      schema: {
        tags: ["tournaments"],
        params: Type.Object({ 
          id: Type.String(),
          matchId: Type.String(),
        }),
        body: Type.Object({
          winnerId: Type.String(),
          score1: Type.Number(),
          score2: Type.Number(),
        }),
        response: { 200: CreateTournamentReply, 400: ErrorResponse, 404: ErrorResponse },
        summary: "Complete a tournament match",
      },
    },
    async (req, reply) => {
      const { id, matchId } = req.params as any;
      const { winnerId, score1, score2 } = req.body as any;
      
      try {
        const tournament = svc.completeMatch(id, matchId, winnerId, score1, score2);
        return tournament;
      } catch (e: any) {
        if (e.message.includes("not found")) {
          return reply.status(404).send({ error: e.message });
        }
        return reply.status(400).send({ error: e.message });
      }
    }
  );

  // Delete tournament
  app.delete(
    "/:id",
    {
      schema: {
        tags: ["tournaments"],
        params: Type.Object({ id: Type.String() }),
        response: { 204: Type.Null(), 404: ErrorResponse },
        summary: "Delete a tournament by id",
      },
    },
    async (req, reply) => {
      const { id } = req.params as any;
      try {
        const deleted = svc.deleteTournament(id);
        if (deleted === 0)
          return reply.status(404).send({ error: "tournament not found" });
        return reply.status(204).send();
      } catch (e: any) {
        return reply.status(500).send({ error: e.message });
      }
    }
  );
};

export default plugin;