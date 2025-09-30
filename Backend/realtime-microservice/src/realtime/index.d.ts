import { WebSocketServer } from 'ws';
import type { FastifyInstance } from 'fastify';
import { GameRoom } from './room.js';
import type { Player } from './types.js';
export declare const rooms: Map<string, GameRoom>;
export declare const players: Map<string, Player>;
export declare function initRealtime(fastify: FastifyInstance): WebSocketServer;
export declare function closeRealtime(): Promise<void>;
//# sourceMappingURL=index.d.ts.map