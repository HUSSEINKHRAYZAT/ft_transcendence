import { Type, Static } from '@sinclair/typebox';

export const ErrorResponse = Type.Object({ error: Type.String() });

export const Session = Type.Object({
  id: Type.Number(),
  userId: Type.Number(),
  sockerId: Type.String(),
  code: Type.Number(),
  createdAt: Type.String(),
});

export const CreateSessionBody = Type.Object({
  userId: Type.Number(),
  sockerId: Type.String(),
  code: Type.Number(),
});

export const CreateSessionReply = Session;

export const UpdateSessionBody = CreateSessionBody;

export type SessionType = Static<typeof Session>;

export type CreateSessionBodyType = Static<typeof CreateSessionBody>;

export type UpdateSessionBodyType = Static<typeof UpdateSessionBody>;