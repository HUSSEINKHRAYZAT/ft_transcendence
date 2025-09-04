import { Type, Static } from '@sinclair/typebox';

export const ErrorResponse = Type.Object({ error: Type.String() });

export const GamePlayer = Type.Object({
  id: Type.Number(),
  gameId: Type.Number(),
  playerId: Type.Number(),
  playerScore: Type.Number({ minimum: 0 }),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export type GamePlayerTS = Static<typeof GamePlayer>;

export const CreateGamePlayerBody = Type.Object({
  gameId: Type.Number(),
  playerId: Type.Number(),
  playerScore: Type.Number({ minimum: 0 }),
});
export type CreateGamePlayerBodyTS = Static<typeof CreateGamePlayerBody>;


export const CreateGamePlayerReply = GamePlayer;

export const UpdateGamePlayerBody = CreateGamePlayerBody;
export type UpdateGamePlayerBodyTS = Static<typeof UpdateGamePlayerBody>;