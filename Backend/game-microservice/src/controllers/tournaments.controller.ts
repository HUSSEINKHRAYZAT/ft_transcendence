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

  app.post(
	"/",
	{
	  schema: {
		tags: ["tournaments"],
		body: CreateTournamentBody,
		response: {
		  201: CreateTournamentReply,
		  409: ErrorResponse,
		  500: ErrorResponse,
		},
		summary: "Create tournament",
	  },
	},
	async (req, reply) => {
	  const body = req.body as CreateTournamentBodyTS;
	  try {
		const newId = svc.createTournament(body);
		const created = svc.getTournamentById(newId);
		return reply.status(201).send(created);
	  } catch (e: any) {
		if (String(e.message).includes("UNIQUE")) {
		  return reply
			.status(409)
			.send({ error: "tournament with same players already exists" });
		}
		return reply.status(500).send({ error: e });
	  }
	}
  );

  app.get(
	"/:id",
	{
	  schema: {
		tags: ["tournaments"],
		params: Type.Object({ id: Type.Number() }),
		response: { 200: CreateTournamentReply, 404: ErrorResponse },
		summary: "Get a tournament by id",
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