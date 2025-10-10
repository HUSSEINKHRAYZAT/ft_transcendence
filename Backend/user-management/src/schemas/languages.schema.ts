import { Type} from '@sinclair/typebox';

export const Language = Type.Object({
    code: Type.String(),
    name: Type.String(),
});

export const LanguagesList = Type.Array(Language);