import WebSocket from 'ws';
import { initGameState, updateGameState, GameState } from './gameState';
import { broadcast } from './broadcaster';

type GameSession = {
  gameId: string;
  players: string[];
  conns: Map<string, WebSocket>;
  state: GameState;
};

const games = new Map<string, GameSession>();

export function joinGame(gameId: string, username: string, ws: WebSocket): GameSession {
  let game = games.get(gameId);
  if (!game) {
    game = { gameId, players: [], conns: new Map(), state: initGameState() };
    games.set(gameId, game);
  }

  if (!game.players.includes(username)) game.players.push(username);
  game.conns.set(username, ws);
  game.state.paddles[username] = 200; // default position

  return game;
}

export function leaveGame(gameId: string, username: string) {
  const game = games.get(gameId);
  if (!game) return;
  game.conns.delete(username);
  game.players = game.players.filter((p) => p !== username);
  delete game.state.paddles[username];
  if (game.players.length === 0) games.delete(gameId);
}

export function tickAllGames() {
  for (const game of games.values()) {
    updateGameState(game.state);
    broadcast(game.conns, { type: 'state', state: game.state });
  }
}
