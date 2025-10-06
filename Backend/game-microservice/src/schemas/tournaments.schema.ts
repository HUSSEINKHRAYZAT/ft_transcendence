import { Type, Static } from '@sinclair/typebox';

export const ErrorResponse = Type.Object({ error: Type.String() });

export const TournamentPlayer = Type.Object({
  id: Type.String(),
  name: Type.String(),
  isOnline: Type.Boolean(),
  isAI: Type.Boolean(),
  isEliminated: Type.Optional(Type.Boolean()),
});

export const TournamentMatch = Type.Object({
  id: Type.String(),
  round: Type.Number(),
  matchIndex: Type.Number(),
  player1: Type.Union([TournamentPlayer, Type.Null()]),
  player2: Type.Union([TournamentPlayer, Type.Null()]),
  winner: Type.Union([TournamentPlayer, Type.Null()]),
  score: Type.Optional(Type.Tuple([Type.Number(), Type.Number()])),
  status: Type.Union([Type.Literal('pending'), Type.Literal('active'), Type.Literal('completed')]),
  gameId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const Tournament = Type.Object({
  id: Type.Optional(Type.Number()),
  tournamentId: Type.String(),
  name: Type.String(),
  size: Type.Number({ minimum: 4 }),
  nbOfPlayers: Type.Number({ minimum: 2 }),
  status: Type.Union([Type.Literal('waiting'), Type.Literal('active'), Type.Literal('completed')]),
  createdBy: Type.String(),
  createdByName: Type.Optional(Type.String()),
  isPublic: Type.Boolean(),
  allowSpectators: Type.Boolean(),
  currentRound: Type.Number(),
  players: Type.Array(TournamentPlayer),
  matches: Type.Optional(Type.Array(TournamentMatch)),
  winnerId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  isComplete: Type.Optional(Type.Boolean()),
  createdAt: Type.String(),
  updatedAt: Type.Optional(Type.String()),
});

export type TournamentTS = Static<typeof Tournament>;
export type TournamentPlayerTS = Static<typeof TournamentPlayer>;
export type TournamentMatchTS = Static<typeof TournamentMatch>;

export const CreateTournamentBody = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  size: Type.Union([Type.Literal(4), Type.Literal(8), Type.Literal(16)]),
  isPublic: Type.Boolean(),
  allowSpectators: Type.Boolean(),
  createdBy: Type.String(),
  createdByName: Type.String(),
});
export type CreateTournamentBodyTS = Static<typeof CreateTournamentBody>;

export const JoinTournamentBody = Type.Object({
  tournamentId: Type.String(),
  playerId: Type.String(),
  playerName: Type.String(),
});
export type JoinTournamentBodyTS = Static<typeof JoinTournamentBody>;

export const StartTournamentBody = Type.Object({
  tournamentId: Type.String(),
});
export type StartTournamentBodyTS = Static<typeof StartTournamentBody>;

export const UpdateMatchBody = Type.Object({
  matchId: Type.String(),
  player1Score: Type.Optional(Type.Number()),
  player2Score: Type.Optional(Type.Number()),
  winnerId: Type.Optional(Type.String()),
  status: Type.Optional(Type.Union([Type.Literal('pending'), Type.Literal('active'), Type.Literal('completed')])),
});
export type UpdateMatchBodyTS = Static<typeof UpdateMatchBody>;

export const CreateTournamentReply = Tournament;
export const TournamentListReply = Type.Array(Tournament);

export const UpdateTournamentBody = Type.Object({
  status: Type.Optional(Type.Union([Type.Literal('waiting'), Type.Literal('active'), Type.Literal('completed')])),
  currentRound: Type.Optional(Type.Number()),
});
export type UpdateTournamentBodyTS = Static<typeof UpdateTournamentBody>;