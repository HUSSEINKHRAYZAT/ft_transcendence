import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import { gamesService } from "../services/games.service";
import {
  CreateGameBody,
  CreateGameBodyTS,
  CreateGameReply,
  ErrorResponse,
  GameTS,
} from "../schemas/games.schema";
const plugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  const svc = gamesService(app);

  app.post(
	"/",
	{
	  schema: {
		tags: ["games"],
		body: CreateGameBody,
		response: { 201: CreateGameReply, 500: ErrorResponse },
		summary: "Create game",
	  },
	},
	async (req, reply) => {
	  const body = req.body as CreateGameBodyTS;
	  try {
		const newId = svc.createGame(body);
		const created = svc.getGameById(newId);
		return reply.status(201).send(created);
	  } catch (e: any) {
		return reply.status(500).send({ error: e });
	  }
	}
  );

  app.get(
	"/:id",
	{
	  schema: {
		tags: ["games"],
		params: Type.Object({ id: Type.Number() }),
		response: { 200: CreateGameReply, 404: ErrorResponse },
		summary: "Get a game by id",
	  },
	},
	async (req, reply) => {
	  const { id } = req.params as any;
	  const game = svc.getGameById(Number(id));
	  if (!game) return reply.status(404).send({ error: "game not found" });
	  return game;
	}
  );

  app.get(
	"/tournament/:tournamentId",
	{
	  schema: {
		tags: ["games"],
		params: Type.Object({ tournamentId: Type.Number() }),
		response: { 200: Type.Array(CreateGameReply), 404: ErrorResponse },
		summary: "Get all games of a tournament by tournament id",
	  },
	},
	async (req, reply) => {
	  const { tournamentId } = req.params as any;
	  const games = svc.getTournamentGames(Number(tournamentId));
	  if (!games || games.length === 0)
		return reply.status(404).send({ error: "no games found" });
	  return games;
	}
  );

  app.delete(
	"/:id",
	{
	  schema: {
		tags: ["games"],
		params: Type.Object({ id: Type.Number() }),
		response: { 204: Type.Null(), 404: ErrorResponse, 500: ErrorResponse },
		summary: "Delete a game by id",
	  },
	},
	async (req, reply) => {
	  const { id } = req.params as any;
	  try {
		const deleted = svc.deleteGame(Number(id));
		if (deleted === 0)
		  return reply.status(404).send({ error: "game not found" });
		return reply.status(204).send();
	  } catch (e: any) {
		return reply.status(500).send({ error: e });
	  }
	}
  );
};

export default plugin;