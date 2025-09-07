import { Type } from '@sinclair/typebox';

export const Stats = Type.Object({
  id: Type.Number(),
  userId: Type.Number(),
  winCount: Type.Number(),
  lossCount: Type.Number(),
  tournamentWinCount: Type.Number(),
  tournamentCount: Type.Number(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  totalGames: Type.Optional(Type.Number()),
});

export const UpdateStatsBody = Type.Object({ 
  winDelta: Type.Optional(Type.Integer()),  
  lossDelta: Type.Optional(Type.Integer()),  
  tWinDelta: Type.Optional(Type.Integer()),  
  tCountDelta: Type.Optional(Type.Integer()),  
});