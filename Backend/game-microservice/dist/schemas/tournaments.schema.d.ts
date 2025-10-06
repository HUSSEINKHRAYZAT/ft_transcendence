import { Static } from '@sinclair/typebox';
export declare const ErrorResponse: import("@sinclair/typebox").TObject<{
    error: import("@sinclair/typebox").TString;
}>;
export declare const TournamentPlayer: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    name: import("@sinclair/typebox").TString;
    isOnline: import("@sinclair/typebox").TBoolean;
    isAI: import("@sinclair/typebox").TBoolean;
    isEliminated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
}>;
export declare const TournamentMatch: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    round: import("@sinclair/typebox").TNumber;
    matchIndex: import("@sinclair/typebox").TNumber;
    player1: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        name: import("@sinclair/typebox").TString;
        isOnline: import("@sinclair/typebox").TBoolean;
        isAI: import("@sinclair/typebox").TBoolean;
        isEliminated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    }>, import("@sinclair/typebox").TNull]>;
    player2: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        name: import("@sinclair/typebox").TString;
        isOnline: import("@sinclair/typebox").TBoolean;
        isAI: import("@sinclair/typebox").TBoolean;
        isEliminated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    }>, import("@sinclair/typebox").TNull]>;
    winner: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        name: import("@sinclair/typebox").TString;
        isOnline: import("@sinclair/typebox").TBoolean;
        isAI: import("@sinclair/typebox").TBoolean;
        isEliminated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    }>, import("@sinclair/typebox").TNull]>;
    score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TTuple<[import("@sinclair/typebox").TNumber, import("@sinclair/typebox").TNumber]>>;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"completed">]>;
    gameId: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>>;
}>;
export declare const Tournament: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    tournamentId: import("@sinclair/typebox").TString;
    name: import("@sinclair/typebox").TString;
    size: import("@sinclair/typebox").TNumber;
    nbOfPlayers: import("@sinclair/typebox").TNumber;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"waiting">, import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"completed">]>;
    createdBy: import("@sinclair/typebox").TString;
    createdByName: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    isPublic: import("@sinclair/typebox").TBoolean;
    allowSpectators: import("@sinclair/typebox").TBoolean;
    currentRound: import("@sinclair/typebox").TNumber;
    players: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        name: import("@sinclair/typebox").TString;
        isOnline: import("@sinclair/typebox").TBoolean;
        isAI: import("@sinclair/typebox").TBoolean;
        isEliminated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    }>>;
    matches: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        round: import("@sinclair/typebox").TNumber;
        matchIndex: import("@sinclair/typebox").TNumber;
        player1: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            name: import("@sinclair/typebox").TString;
            isOnline: import("@sinclair/typebox").TBoolean;
            isAI: import("@sinclair/typebox").TBoolean;
            isEliminated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        }>, import("@sinclair/typebox").TNull]>;
        player2: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            name: import("@sinclair/typebox").TString;
            isOnline: import("@sinclair/typebox").TBoolean;
            isAI: import("@sinclair/typebox").TBoolean;
            isEliminated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        }>, import("@sinclair/typebox").TNull]>;
        winner: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            name: import("@sinclair/typebox").TString;
            isOnline: import("@sinclair/typebox").TBoolean;
            isAI: import("@sinclair/typebox").TBoolean;
            isEliminated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        }>, import("@sinclair/typebox").TNull]>;
        score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TTuple<[import("@sinclair/typebox").TNumber, import("@sinclair/typebox").TNumber]>>;
        status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"completed">]>;
        gameId: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>>;
    }>>>;
    winnerId: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>>;
    isComplete: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    createdAt: import("@sinclair/typebox").TString;
    updatedAt: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type TournamentTS = Static<typeof Tournament>;
export type TournamentPlayerTS = Static<typeof TournamentPlayer>;
export type TournamentMatchTS = Static<typeof TournamentMatch>;
export declare const CreateTournamentBody: import("@sinclair/typebox").TObject<{
    name: import("@sinclair/typebox").TString;
    size: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<4>, import("@sinclair/typebox").TLiteral<8>, import("@sinclair/typebox").TLiteral<16>]>;
    isPublic: import("@sinclair/typebox").TBoolean;
    allowSpectators: import("@sinclair/typebox").TBoolean;
    createdBy: import("@sinclair/typebox").TString;
    createdByName: import("@sinclair/typebox").TString;
}>;
export type CreateTournamentBodyTS = Static<typeof CreateTournamentBody>;
export declare const JoinTournamentBody: import("@sinclair/typebox").TObject<{
    tournamentId: import("@sinclair/typebox").TString;
    playerId: import("@sinclair/typebox").TString;
    playerName: import("@sinclair/typebox").TString;
}>;
export type JoinTournamentBodyTS = Static<typeof JoinTournamentBody>;
export declare const StartTournamentBody: import("@sinclair/typebox").TObject<{
    tournamentId: import("@sinclair/typebox").TString;
}>;
export type StartTournamentBodyTS = Static<typeof StartTournamentBody>;
export declare const UpdateMatchBody: import("@sinclair/typebox").TObject<{
    matchId: import("@sinclair/typebox").TString;
    player1Score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    player2Score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    winnerId: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    status: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"completed">]>>;
}>;
export type UpdateMatchBodyTS = Static<typeof UpdateMatchBody>;
export declare const CreateTournamentReply: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    tournamentId: import("@sinclair/typebox").TString;
    name: import("@sinclair/typebox").TString;
    size: import("@sinclair/typebox").TNumber;
    nbOfPlayers: import("@sinclair/typebox").TNumber;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"waiting">, import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"completed">]>;
    createdBy: import("@sinclair/typebox").TString;
    createdByName: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    isPublic: import("@sinclair/typebox").TBoolean;
    allowSpectators: import("@sinclair/typebox").TBoolean;
    currentRound: import("@sinclair/typebox").TNumber;
    players: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        name: import("@sinclair/typebox").TString;
        isOnline: import("@sinclair/typebox").TBoolean;
        isAI: import("@sinclair/typebox").TBoolean;
        isEliminated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    }>>;
    matches: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        round: import("@sinclair/typebox").TNumber;
        matchIndex: import("@sinclair/typebox").TNumber;
        player1: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            name: import("@sinclair/typebox").TString;
            isOnline: import("@sinclair/typebox").TBoolean;
            isAI: import("@sinclair/typebox").TBoolean;
            isEliminated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        }>, import("@sinclair/typebox").TNull]>;
        player2: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            name: import("@sinclair/typebox").TString;
            isOnline: import("@sinclair/typebox").TBoolean;
            isAI: import("@sinclair/typebox").TBoolean;
            isEliminated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        }>, import("@sinclair/typebox").TNull]>;
        winner: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            name: import("@sinclair/typebox").TString;
            isOnline: import("@sinclair/typebox").TBoolean;
            isAI: import("@sinclair/typebox").TBoolean;
            isEliminated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        }>, import("@sinclair/typebox").TNull]>;
        score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TTuple<[import("@sinclair/typebox").TNumber, import("@sinclair/typebox").TNumber]>>;
        status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"completed">]>;
        gameId: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>>;
    }>>>;
    winnerId: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>>;
    isComplete: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    createdAt: import("@sinclair/typebox").TString;
    updatedAt: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export declare const TournamentListReply: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    tournamentId: import("@sinclair/typebox").TString;
    name: import("@sinclair/typebox").TString;
    size: import("@sinclair/typebox").TNumber;
    nbOfPlayers: import("@sinclair/typebox").TNumber;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"waiting">, import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"completed">]>;
    createdBy: import("@sinclair/typebox").TString;
    createdByName: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    isPublic: import("@sinclair/typebox").TBoolean;
    allowSpectators: import("@sinclair/typebox").TBoolean;
    currentRound: import("@sinclair/typebox").TNumber;
    players: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        name: import("@sinclair/typebox").TString;
        isOnline: import("@sinclair/typebox").TBoolean;
        isAI: import("@sinclair/typebox").TBoolean;
        isEliminated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    }>>;
    matches: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        round: import("@sinclair/typebox").TNumber;
        matchIndex: import("@sinclair/typebox").TNumber;
        player1: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            name: import("@sinclair/typebox").TString;
            isOnline: import("@sinclair/typebox").TBoolean;
            isAI: import("@sinclair/typebox").TBoolean;
            isEliminated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        }>, import("@sinclair/typebox").TNull]>;
        player2: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            name: import("@sinclair/typebox").TString;
            isOnline: import("@sinclair/typebox").TBoolean;
            isAI: import("@sinclair/typebox").TBoolean;
            isEliminated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        }>, import("@sinclair/typebox").TNull]>;
        winner: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            name: import("@sinclair/typebox").TString;
            isOnline: import("@sinclair/typebox").TBoolean;
            isAI: import("@sinclair/typebox").TBoolean;
            isEliminated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        }>, import("@sinclair/typebox").TNull]>;
        score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TTuple<[import("@sinclair/typebox").TNumber, import("@sinclair/typebox").TNumber]>>;
        status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"completed">]>;
        gameId: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>>;
    }>>>;
    winnerId: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>>;
    isComplete: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    createdAt: import("@sinclair/typebox").TString;
    updatedAt: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>>;
export declare const UpdateTournamentBody: import("@sinclair/typebox").TObject<{
    status: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"waiting">, import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"completed">]>>;
    currentRound: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
}>;
export type UpdateTournamentBodyTS = Static<typeof UpdateTournamentBody>;
//# sourceMappingURL=tournaments.schema.d.ts.map