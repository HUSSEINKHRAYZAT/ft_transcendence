import type { GameState } from './types.js';
export declare class GameRoom {
    id: string;
    hostId: string;
    gameMode: '2p' | '4p';
    maxPlayers: number;
    players: Map<string, {
        id: string;
        name: string;
        isReady: boolean;
        joinedAt: number;
    }>;
    isGameStarted: boolean;
    gameState: GameState | null;
    createdAt: number;
    isPaused?: boolean;
    pausedBy?: string;
    constructor(id: string, hostId: string, hostName: string, gameMode?: '2p' | '4p');
    addPlayer(playerId: string, playerName: string): boolean;
    removePlayer(playerId: string): boolean;
    getPlayerCount(): number;
    canStartGame(): boolean;
    startGame(): boolean;
    info(): {
        roomId: string;
        hostId: string;
        gameMode: "2p" | "4p";
        isGameStarted: boolean;
        playerCount: number;
        maxPlayers: number;
        players: {
            id: string;
            name: string;
            isReady: boolean;
            joinedAt: number;
        }[];
    };
}
//# sourceMappingURL=room.d.ts.map