import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import { FastifyInstance } from "fastify";
import { config } from "../config";
import { GameRoom } from "./room";

/* ------------------------ Types ------------------------ */
interface Player {
  id: string;
  name: string;
  roomId: string | null;
  connectedAt: number;
}

interface Message {
  type: string;
  [key: string]: any;
}

/* ------------------------ State ------------------------ */
export const rooms = new Map<string, GameRoom>();
export const players = new Map<string, Player>();
const sockets = new Map<string, WebSocket>();

let wss: WebSocketServer | null = null;
let cleanupTimer: NodeJS.Timeout | null = null;

/* ------------------------ Lifecycle ------------------------ */
export function initRealtime(fastify: FastifyInstance): WebSocketServer {
  wss = new WebSocketServer({
    server: fastify.server,
    maxPayload: config.WS_MAX_MSG_SIZE,
  });

  wss.on("connection", (ws: WebSocket & { _id?: string }) => {
    const id = randomUUID();
    ws._id = id;
    sockets.set(id, ws);
    fastify.log.info(`🔌 Player connected: ${id}`);

    ws.on("message", (raw) => {
      try {
        const msg: Message = JSON.parse(raw.toString());
        handleMessage(fastify, id, ws, msg);
      } catch {
        send(ws, { type: "error", error: "Invalid JSON message" });
      }
    });

    ws.on("close", () => {
      handleDisconnect(fastify, id);
    });

    ws.on("error", (err) => {
      fastify.log.error({ err }, "WS error");
    });
  });

  // periodic cleanup of empty rooms
  cleanupTimer = setInterval(
    () => cleanupOldRooms(fastify),
    config.CLEANUP_INTERVAL_MS
  );

  return wss;
}

export async function closeRealtime(): Promise<void> {
  if (cleanupTimer) clearInterval(cleanupTimer);
  if (wss) {
    broadcast({ type: "server_shutdown", message: "Server is shutting down" });
    await new Promise<void>((resolve) => wss!.close(() => resolve()));
  }
  sockets.clear();
  players.clear();
  rooms.clear();
}

/* ------------------------ Helpers ------------------------ */
function send(ws: WebSocket, payload: any): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function emitToRoom(roomId: string, payload: any): void {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const playerId of room.players.keys()) {
    const s = sockets.get(playerId);
    if (s && s.readyState === WebSocket.OPEN) {
      s.send(JSON.stringify(payload));
    }
  }
}

function emitToRoomExcept(
  roomId: string,
  exceptPlayerId: string,
  payload: any
): void {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const playerId of room.players.keys()) {
    if (playerId === exceptPlayerId) continue;
    const s = sockets.get(playerId);
    if (s && s.readyState === WebSocket.OPEN) {
      s.send(JSON.stringify(payload));
    }
  }
}

function broadcast(payload: any): void {
  for (const s of sockets.values()) {
    if (s.readyState === WebSocket.OPEN) {
      s.send(JSON.stringify(payload));
    }
  }
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateUniqueRoomCode(): string {
  let code: string;
  do code = generateRoomCode();
  while (rooms.has(code));
  return code;
}

function cleanupOldRooms(fastify: FastifyInstance): void {
  const now = Date.now();
  let cleaned = 0;
  for (const [roomId, room] of rooms.entries()) {
    if (room.getPlayerCount() === 0) {
      const ageMin = (now - room.createdAt) / (1000 * 60);
      if (ageMin > config.EMPTY_ROOM_MAX_AGE_MIN) {
        rooms.delete(roomId);
        cleaned++;
      }
    }
  }
  if (cleaned > 0)
    fastify.log.info(`🧹 Cleaned ${cleaned} empty rooms`);
}

/* ------------------------ Handlers ------------------------ */
function handleDisconnect(fastify: FastifyInstance, playerId: string): void {
  fastify.log.info(`🔌 Player disconnected: ${playerId}`);
  const player = players.get(playerId);
  sockets.delete(playerId);

  if (player?.roomId) {
    const room = rooms.get(player.roomId);
    if (room) {
      room.removePlayer(playerId);
      emitToRoom(room.id, { type: "player_left", id: playerId });

      if (room.getPlayerCount() === 0) {
        rooms.delete(room.id);
        fastify.log.info(`🗑️ Room ${room.id} deleted (empty)`);
      } else {
        emitToRoom(room.id, { type: "room_updated", ...room.info() });
      }
    }
  }
  players.delete(playerId);
}

function handleMessage(
  fastify: FastifyInstance,
  playerId: string,
  ws: WebSocket,
  msg: Message
): void {
  switch (msg.type) {
    case "register_player": {
      const name =
        (msg.name && String(msg.name).trim()) || "Player";
      players.set(playerId, {
        id: playerId,
        name,
        roomId: null,
        connectedAt: Date.now(),
      });
      send(ws, { type: "registered", id: playerId, name });
      break;
    }
    case "create_room": {
      const p = players.get(playerId);
      if (!p) return send(ws, { type: "error", error: "Player not registered" });
      const gameMode = msg.gameMode === "4p" ? "4p" : "2p";
      const roomId = generateUniqueRoomCode();
      const room = new GameRoom(roomId, playerId, p.name, gameMode);
      rooms.set(roomId, room);
      p.roomId = roomId;
      send(ws, { type: "room_created", ...room.info() });
      emitToRoom(roomId, { type: "room_updated", ...room.info() });
      break;
    }
    // ... ⚡ The rest of your handlers (join_room, leave_room, start_game, etc.)
    // stay exactly the same, just typed like above.
    default:
      send(ws, { type: "error", error: `Unknown message type: ${msg.type}` });
  }
}
