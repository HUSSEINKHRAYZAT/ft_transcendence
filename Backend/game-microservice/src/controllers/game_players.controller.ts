import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import { gamePlayersService } from "../services/game_players.service";
import { CreateGamePlayerBody, CreateGamePlayerBodyTS, CreateGamePlayerReply, ErrorResponse, UpdateGamePlayerBody, UpdateGamePlayerBodyTS } from "../schemas/game_players.schema";

const plugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  const svc = gamePlayersService(app);

  app.post(
	"/",
	{
	  schema: {
		tags: ["game_players"],
		body: CreateGamePlayerBody,
		response: { 201: CreateGamePlayerReply, 500: ErrorResponse },
		summary: "Create game player",
	  },
	},
	async (req, reply) => {
	  const body = req.body as CreateGamePlayerBodyTS;
	  try {
		const newId = svc.createGamePlayer(body);
		const created = svc.getGamePlayerById(newId);
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
		tags: ["game_players"],
		params: Type.Object({ id: Type.Number() }),
		response: { 200: CreateGamePlayerReply, 404: ErrorResponse },
		summary: "Get a game player by id",
	  },
	},
	async (req, reply) => {
	  const { id } = req.params as any;
	  const gamePlayer = svc.getGamePlayerById(Number(id));
	  if (!gamePlayer)
		return reply.status(404).send({ error: "game player not found" });
	  return gamePlayer;
	}
  );

  app.get(
	"/game/:gameId",
	{
	  schema: {
		tags: ["game_players"],
		params: Type.Object({ gameId: Type.Number() }),
		response: { 200: Type.Array(CreateGamePlayerReply), 404: ErrorResponse },
		summary: "Get all game players by gameId",
	  },
	},
	async (req, reply) => {
	  const { gameId } = req.params as any;
	  const gamePlayers = svc.getGamePlayersByGameId(Number(gameId));
	  if (!gamePlayers || gamePlayers.length === 0)
		return reply.status(404).send({ error: "no game players found for this gameId" });
	  return gamePlayers;
	}
  );

  app.delete(
	"/:id",
	{
	  schema: {
		tags: ["game_players"],
		params: Type.Object({ id: Type.Number() }),
		response: { 204: Type.Null(), 404: ErrorResponse },
		summary: "Delete a game player by id",
	  },
	},
	async (req, reply) => {
	  const { id } = req.params as any;
	  const deleted = svc.deleteGamePlayer(Number(id));
	  if (deleted === 0)
		return reply.status(404).send({ error: "game player not found" });
	  return reply.status(204).send();
	}
  );

  app.patch(
	"/:id",
	{
	  schema: {
		tags: ["game_players"],
		params: Type.Object({ id: Type.Number() }),
		body: UpdateGamePlayerBody,
		response: { 200: CreateGamePlayerReply, 404: ErrorResponse, 500: ErrorResponse },
		summary: "Update a game player by id",
	  },
	},
	async (req, reply) => {
	  const { id } = req.params as any;
	  const body = req.body as UpdateGamePlayerBodyTS;
	  try {
		const updated = svc.updateGamePlayer(Number(id), body);
		if (updated === 0)
		  return reply.status(404).send({ error: "game player not found" });
		const gamePlayer = svc.getGamePlayerById(Number(id));
		return reply.status(200).send(gamePlayer);
	  } catch (e: any) {
		return reply.status(500).send({ error: e });
	  }
	}
  );
};

export default plugin;