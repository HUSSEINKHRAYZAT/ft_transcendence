import { Type, Static } from '@sinclair/typebox';

export const Relation = Type.Object({
  id: Type.Number(),
  userOneId: Type.Number(),
  userTwoId: Type.Number(),
  typeId: Type.Number(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const RelationWithType = Type.Intersect([
  Relation,
  Type.Object({ type: Type.String() }),
]);

export type RelationWithTypeTS = Static<typeof RelationWithType>;

export const CreateRelationBody = Type.Object({
  userOneId: Type.Number(),
  userTwoId: Type.Number(),
  type: Type.String(),
});
export type CreateRelationBodyTS = Static<typeof CreateRelationBody>;

export const CreateRelationBodyWithUsername = Type.Object({
  usernameOne: Type.String(),
  usernameTwo: Type.String(),
  type: Type.String(),
});
export type CreateRelationBodyWithUsernameTS = Static<typeof CreateRelationBodyWithUsername>;

export const CreateRelationReply = RelationWithType;

export const UpdateRelationBody = CreateRelationBody;
export type UpdateRelationBodyTS = Static<typeof UpdateRelationBody>;

export const Friend = Type.Object({
  id: Type.Number(),
  username: Type.String(),
});
