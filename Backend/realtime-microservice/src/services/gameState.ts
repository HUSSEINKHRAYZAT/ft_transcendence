export type GameState = {
  ball: { x: number; y: number; vx: number; vy: number };
  paddles: Record<string, number>; // username → y
  score: { left: number; right: number };
};

export function initGameState(): GameState {
  return {
    ball: { x: 300, y: 200, vx: 3, vy: 2 },
    paddles: {},
    score: { left: 0, right: 0 },
  };
}

export function updateGameState(state: GameState) {
  state.ball.x += state.ball.vx;
  state.ball.y += state.ball.vy;

  if (state.ball.y <= 0 || state.ball.y >= 400) {
    state.ball.vy *= -1;
  }

  // TODO: add paddle collision & scoring
}
