import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import { tournamentsService } from "../services/tournaments.service";
import {
  CreateTournamentBody,
  CreateTournamentBodyTS,
  JoinTournamentBody,
  JoinTournamentBodyTS,
  StartTournamentBody,
  StartTournamentBodyTS,
  UpdateMatchBody,
  UpdateMatchBodyTS,
  Tournament,
  ErrorResponse,
} from "../schemas/tournaments.schema";

const plugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  const svc = tournamentsService(app);

  // Create tournament
  app.post(
	"/",
	{
	  schema: {
		tags: ["tournaments"],
		body: CreateTournamentBody,
		response: {
		  201: Tournament,
		  409: ErrorResponse,
		  500: ErrorResponse,
		},
		summary: "Create tournament",
	  },
	},
	async (req, reply) => {
	  const body = req.body as CreateTournamentBodyTS;
	  try {
		const created = svc.createTournament(body);
		return reply.status(201).send(created);
	  } catch (e: any) {
		return reply.status(500).send({ error: e.message || 'Failed to create tournament' });
	  }
	}
  );

  // Get all tournaments
  app.get(
	"/",
	{
	  schema: {
		tags: ["tournaments"],
		response: { 200: Type.Array(Tournament), 500: ErrorResponse },
		summary: "Get all active tournaments",
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

  // Get tournament by ID
  app.get(
	"/:id",
	{
	  schema: {
		tags: ["tournaments"],
		params: Type.Object({ id: Type.Number() }),
		response: { 200: Tournament, 404: ErrorResponse },
		summary: "Get a tournament by database ID",
	  },
	},
	async (req, reply) => {
	  const { id } = req.params as any;
	  const tournament = svc.getTournamentById(Number(id));
	  if (!tournament)
		return reply.status(404).send({ error: "tournament not found" });
	  return tournament;
	}
  );

  // Get tournament by code
  app.get(
	"/code/:code",
	{
	  schema: {
		tags: ["tournaments"],
		params: Type.Object({ code: Type.String({ minLength: 6, maxLength: 6 }) }),
		response: { 200: Tournament, 404: ErrorResponse },
		summary: "Get a tournament by 6-character code",
	  },
	},
	async (req, reply) => {
	  const { code } = req.params as any;
	  const tournament = svc.getTournamentByCode(code.toUpperCase());
	  if (!tournament)
		return reply.status(404).send({ error: "tournament not found" });
	  return tournament;
	}
  );

  // Join tournament
  app.post(
	"/:tournamentId/join",
	{
	  schema: {
		tags: ["tournaments"],
		params: Type.Object({ tournamentId: Type.String() }),
		body: JoinTournamentBody,
		response: {
		  200: Tournament,
		  400: ErrorResponse,
		  404: ErrorResponse,
		  500: ErrorResponse,
		},
		summary: "Join a tournament",
	  },
	},
	async (req, reply) => {
	  const { tournamentId } = req.params as any;
	  const body = req.body as JoinTournamentBodyTS;
	  try {
		const updated = svc.joinTournament({
		  ...body,
		  tournamentId: tournamentId.toUpperCase(),
		});
		return updated;
	  } catch (e: any) {
		if (e.message.includes('not found')) {
		  return reply.status(404).send({ error: e.message });
		}
		return reply.status(400).send({ error: e.message });
	  }
	}
  );

  // Start tournament
  app.post(
	"/:tournamentId/start",
	{
	  schema: {
		tags: ["tournaments"],
		params: Type.Object({ tournamentId: Type.String() }),
		body: StartTournamentBody,
		response: {
		  200: Tournament,
		  400: ErrorResponse,
		  404: ErrorResponse,
		  500: ErrorResponse,
		},
		summary: "Start a tournament and generate bracket",
	  },
	},
	async (req, reply) => {
	  const { tournamentId } = req.params as any;
	  try {
		const updated = svc.startTournament({
		  tournamentId: tournamentId.toUpperCase(),
		});
		return updated;
	  } catch (e: any) {
		if (e.message.includes('not found')) {
		  return reply.status(404).send({ error: e.message });
		}
		return reply.status(400).send({ error: e.message });
	  }
	}
  );

  // Update match result
  app.put(
	"/:tournamentId/matches/:matchId",
	{
	  schema: {
		tags: ["tournaments"],
		params: Type.Object({ 
		  tournamentId: Type.String(),
		  matchId: Type.String() 
		}),
		body: UpdateMatchBody,
		response: {
		  200: Tournament,
		  404: ErrorResponse,
		  500: ErrorResponse,
		},
		summary: "Update match result and advance bracket",
	  },
	},
	async (req, reply) => {
	  const { tournamentId, matchId } = req.params as any;
	  const body = req.body as UpdateMatchBodyTS;
	  try {
		const updated = svc.updateMatch(tournamentId.toUpperCase(), {
		  ...body,
		  matchId,
		});
		return updated;
	  } catch (e: any) {
		if (e.message.includes('not found')) {
		  return reply.status(404).send({ error: e.message });
		}
		return reply.status(500).send({ error: e.message });
	  }
	}
  );

  // Delete tournament
  app.delete(
	"/:id",
	{
	  schema: {
		tags: ["tournaments"],
		params: Type.Object({ id: Type.Number() }),
		response: { 204: Type.Null(), 404: ErrorResponse },
		summary: "Delete a tournament by id",
	  },
	},
	async (req, reply) => {
	  const { id } = req.params as any;
	  const deleted = svc.deleteTournament(Number(id));
	  if (deleted === 0)
		return reply.status(404).send({ error: "tournament not found" });
	  return reply.status(204).send();
	}
  );
};

export default plugin;