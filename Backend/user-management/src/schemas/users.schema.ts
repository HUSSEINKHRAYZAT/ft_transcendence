import { Type } from '@sinclair/typebox';

export const ErrorResponse = Type.Object({ error: Type.String() });

export const User = Type.Object({
  id: Type.Number(),
  firstName: Type.String(),
  lastName: Type.String(),
  username: Type.String(),
  email: Type.String({ format: 'email' }),
  isVerified: Type.Number(),
  twoFactorEnabled: Type.Number(),
  profilePath: Type.Optional(Type.String()),
  status: Type.String(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const CreateUserBody = Type.Object({
  firstName: Type.String(),
  lastName: Type.String(),
  username: Type.String(),
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8 }),
});

export const CreateUserReply = User;

export const UpdateUserBody = Type.Partial(
  Type.Object({
    firstName: Type.String(),
    lastName: Type.String(),
    username: Type.String(),
    email: Type.String({ format: 'email' }),
    profilePath: Type.String(),
    status: Type.String(),
    twoFactorEnabled: Type.Number({ minimum: 0, maximum: 1 }),
    isVerified: Type.Number({ minimum: 0, maximum: 1 }),
  })
);