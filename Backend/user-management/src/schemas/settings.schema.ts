import { Type } from '@sinclair/typebox';

export const Settings = Type.Object({
  id: Type.Number(),
  username: Type.String(),
  languageCode: Type.String(),
  accentColor: Type.String(),
  backgroundTheme: Type.String(),
});

export const UpsertSettingsBody = Type.Object({
  username: Type.String(),
  languageCode: Type.Optional(Type.String()),
  accentColor: Type.Optional(Type.String()),
  backgroundTheme: Type.Optional(Type.String()),
});
