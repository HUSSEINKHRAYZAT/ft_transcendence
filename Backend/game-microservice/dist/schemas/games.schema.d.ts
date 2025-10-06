import { Static } from '@sinclair/typebox';
export declare const ErrorResponse: import("@sinclair/typebox").TObject<{
    error: import("@sinclair/typebox").TString;
}>;
export declare const Game: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TNumber;
    tournamentId: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    createdAt: import("@sinclair/typebox").TString;
}>;
export type GameTS = Static<typeof Game>;
export declare const CreateGameBody: import("@sinclair/typebox").TObject<{
    tournamentId: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
}>;
export type CreateGameBodyTS = Static<typeof CreateGameBody>;
export declare const CreateGameReply: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TNumber;
    tournamentId: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    createdAt: import("@sinclair/typebox").TString;
}>;
export declare const UpdateGameBody: import("@sinclair/typebox").TObject<{
    tournamentId: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
}>;
export type UpdateGameBodyTS = Static<typeof UpdateGameBody>;
//# sourceMappingURL=games.schema.d.ts.map