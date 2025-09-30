export interface Player {
  id: string;
  name: string;
  roomId: string | null;
  connectedAt: number;
}

export interface PlayerInRoom {
  id: string;
  name: string;
  isReady: boolean;
  joinedAt: number;
}

export interface GameState {
  ball: { x: number; y: number; z: number; vx: number; vy: number; vz: number };
  paddles: { x: number; y: number; z: number }[];
  scores: number[];
  lastUpdate: number;
  playerAssignment?: Record<number, string | undefined>;
}

export interface HealthResponse {
  status: string;
  message: string;
  timestamp: string;
  rooms: number;
  connectedPlayers: number;
}

/* Generic message coming over WebSocket */
export interface Message {
  type: string;
  [key: string]: any;
}
