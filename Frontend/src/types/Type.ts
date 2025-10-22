import { User } from "./User";

export type Connection =
  | "local"
  | "ai"
  | "ai3"
  | "remoteHost"
  | "remoteGuest"
  | "remote4Host"
  | "remote4Guest";

export type PlayerCount = 2 | 4;

// export type ObstacleShape = "sphere" | "cylinder" | "cone" | "capsule" | "disc" | "box";
export type ObstacleShape = "box";


export interface GameConfig {
  playerCount: PlayerCount;
  connection: Connection;
  aiDifficulty?: number;
  wsUrl?: string;
  roomId?: string;
  winScore?: number;
  matchId?: string;
  currentUser?: User | null;
  sessionId?: string | null;
  displayNames?: string[];
  obstacleShape?: ObstacleShape;
  skipCountdown?: boolean;
  tournament?: {
    id: string;
    matchId: string;
    round: number;
    matchIndex: number;
    players?: Array<{
      id: string;
      name: string;
      isAI?: boolean;
      side?: 'left' | 'right';
    }>;
  };
}

export type Session = { user: User; sessionId: string };

// afayad // from RemoteMsgShort to RemoveMsgShort
export type RemoteMsgShort =
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
        textureIndex?: number; // Optional: for explicit texture synchronization
      }[];
    }
  | { t: "input"; idx: number; neg: boolean; pos: boolean; sid?: string }
  | { t: "chat_message"; message: { id: string; playerId: string; playerName: string; message: string; timestamp: number; type: 'message' | 'system' | 'join' | 'leave' } }
  | { t: "user_joined"; user: { id: string; name: string; isConnected: boolean } }
  | { t: "user_left"; userId: string }
  | { t: "join_chat"; user: { id: string; name: string; isConnected: boolean } }
  | { t: "leave_chat"; userId: string }
  | { t: "gameExit"; gameExit: boolean; exitedBy: string; reason: string; finalScores: number[]; timestamp: number };

export type Match = { a: string; b: string; winner?: string };
