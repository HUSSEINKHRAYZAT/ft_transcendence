import { Type, Static } from '@sinclair/typebox';

export const ErrorResponse = Type.Object({ error: Type.String() });

export const Game = Type.Object({
  id: Type.Number(),
  tournamentId: Type.Optional(Type.Number()),
  createdAt: Type.String(),
});

export type GameTS = Static<typeof Game>;

export const CreateGameBody = Type.Object({
  tournamentId: Type.Optional(Type.Number()),
});
export type CreateGameBodyTS = Static<typeof CreateGameBody>;


export const CreateGameReply = Game;

export const UpdateGameBody = CreateGameBody;
export type UpdateGameBodyTS = Static<typeof UpdateGameBody>;