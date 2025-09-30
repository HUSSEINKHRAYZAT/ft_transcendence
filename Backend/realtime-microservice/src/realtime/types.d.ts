export type Json = Record<string, any>;
export interface Player {
    id: string;
    name: string;
    roomId: string | null;
    connectedAt: number;
}
export interface GameState {
    ball: {
        x: number;
        y: number;
        z: number;
        vx: number;
        vy: number;
        vz: number;
    };
    paddles: Array<{
        x: number;
        y: number;
        z: number;
    }>;
    scores: [number, number];
    playerAssignment?: Record<number, string>;
    lastUpdate: number;
}
export interface InboundMsg {
    type: string;
    [k: string]: any;
}
export interface OutboundMsg {
    type: string;
    [k: string]: any;
}
//# sourceMappingURL=types.d.ts.map