import { Static } from '@sinclair/typebox';
export declare const ErrorResponse: import("@sinclair/typebox").TObject<{
    error: import("@sinclair/typebox").TString;
}>;
export declare const GamePlayer: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TNumber;
    gameId: import("@sinclair/typebox").TNumber;
    playerId: import("@sinclair/typebox").TNumber;
    playerScore: import("@sinclair/typebox").TNumber;
    createdAt: import("@sinclair/typebox").TString;
    updatedAt: import("@sinclair/typebox").TString;
}>;
export type GamePlayerTS = Static<typeof GamePlayer>;
export declare const CreateGamePlayerBody: import("@sinclair/typebox").TObject<{
    gameId: import("@sinclair/typebox").TNumber;
    playerId: import("@sinclair/typebox").TNumber;
    playerScore: import("@sinclair/typebox").TNumber;
}>;
export type CreateGamePlayerBodyTS = Static<typeof CreateGamePlayerBody>;
export declare const CreateGamePlayerReply: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TNumber;
    gameId: import("@sinclair/typebox").TNumber;
    playerId: import("@sinclair/typebox").TNumber;
    playerScore: import("@sinclair/typebox").TNumber;
    createdAt: import("@sinclair/typebox").TString;
    updatedAt: import("@sinclair/typebox").TString;
}>;
export declare const UpdateGamePlayerBody: import("@sinclair/typebox").TObject<{
    gameId: import("@sinclair/typebox").TNumber;
    playerId: import("@sinclair/typebox").TNumber;
    playerScore: import("@sinclair/typebox").TNumber;
}>;
export type UpdateGamePlayerBodyTS = Static<typeof UpdateGamePlayerBody>;
//# sourceMappingURL=game_players.schema.d.ts.map