import { Type, Static } from '@sinclair/typebox';

export const RelationType = Type.Object({
  id: Type.Number(),
  type: Type.String(),
  createdAt: Type.String(),
});
export type RelationTypeTS = Static<typeof RelationType>;

export const CreateRelationTypeBody = Type.Object({
  type: Type.String(),
});
export type CreateRelationTypeBodyTS = Static<typeof CreateRelationTypeBody>;

export const CreateRelationTypeReply = RelationType;
export const UpdateRelationTypeBody = CreateRelationTypeBody;
export type UpdateRelationTypeBodyTS = Static<typeof UpdateRelationTypeBody>;
