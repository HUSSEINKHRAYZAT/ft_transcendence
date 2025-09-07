import type { GameState } from '../services/gameState';

export type ClientMessage =
  | { type: 'join'; gameId: string }
  | { type: 'move'; y: number }
  | { type: 'leave' }
  | { type: 'ping' };

export type ServerMessage =
  | { type: 'welcome'; username: string; gameId: string }
  | { type: 'state'; state: GameState }
  | { type: 'player-joined'; username: string }
  | { type: 'player-left'; username: string }
  | { type: 'pong' }
  | { type: 'error'; error: string };
