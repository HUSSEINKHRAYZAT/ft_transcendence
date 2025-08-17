// Shared types

export type Connection =
  | "local"
  | "ai"           // 2P vs AI
  | "ai3"          // 4P: human + 3 AI
  | "remoteHost"
  | "remoteGuest"
  | "remote4Host"
  | "remote4Guest";

export type PlayerCount = 2 | 4;

export type ObstacleShape = "sphere" | "cylinder" | "cone" | "capsule" | "disc" | "box";

export interface GameConfig {
  playerCount: PlayerCount;
  connection: Connection;
  aiDifficulty?: number;
  wsUrl?: string;
  roomId?: string;
  winScore?: number;
  matchId?: string;
  tournament?: {
    tournamentId: string;
    round: number;
    matchIndex: number;
    leftUserId: string;
    rightUserId: string;
  };
  currentUser?: User | null;
  sessionId?: string | null;
  displayNames?: string[];
  obstacleShape?: ObstacleShape;
}

export type User = { id: string; name: string; avatarUrl?: string };
export type Session = { user: User; sessionId: string };

// Relay messages (host authoritative)
export type RemoteMsg =
  | { t: "hello"; roomId: string; mode: "2p" | "4p"; sid?: string }
  | { t: "join"; roomId: string; idx?: 0 | 1 | 2 | 3 }
  | { t: "assign"; idx: number }
  | { t: "start" }
  | {
      t: "state";
      ball: { x: number; y: number; z: number; vx: number; vy: number; vz: number };
      paddles: { x: number; y: number; z: number }[];
      scores: number[];
      obstacles: {
        x: number; z: number; radius: number;
        color: [number, number, number];
        cap: [number, number, number];
        shape?: ObstacleShape;
      }[];
    }
  | { t: "input"; idx: number; neg: boolean; pos: boolean; sid?: string }
  | { t: "chat_message"; message: { id: string; playerId: string; playerName: string; message: string; timestamp: number; type: 'message' | 'system' | 'join' | 'leave' } }
  | { t: "user_joined"; user: { id: string; name: string; isConnected: boolean } }
  | { t: "user_left"; userId: string }
  | { t: "join_chat"; user: { id: string; name: string; isConnected: boolean } }
  | { t: "leave_chat"; userId: string };

export type Match = { a: string; b: string; winner?: string };
