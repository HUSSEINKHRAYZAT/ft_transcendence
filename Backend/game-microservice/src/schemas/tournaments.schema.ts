import { Type, Static } from '@sinclair/typebox';

export const ErrorResponse = Type.Object({ error: Type.String() });

export const Tournament = Type.Object({
  id: Type.Number(),
  nbOfPlayers: Type.Number({ minimum: 2 }),
  createdAt: Type.String(),
});

export type TournamentTS = Static<typeof Tournament>;

export const CreateTournamentBody = Type.Object({
  nbOfPlayers: Type.Number(),
});
export type CreateTournamentBodyTS = Static<typeof CreateTournamentBody>;


export const CreateTournamentReply = Tournament;

export const UpdateTournamentBody = CreateTournamentBody;
export type UpdateTournamentBodyTS = Static<typeof UpdateTournamentBody>;