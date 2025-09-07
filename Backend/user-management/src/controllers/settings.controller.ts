import { errorCodes, type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import { settingsService } from '../services/settings.service';
import { Settings, UpsertSettingsBody } from '../schemas/settings.schema';
import { ErrorResponse } from '../schemas/users.schema';
import { Type } from '@sinclair/typebox';

const plugin: FastifyPluginAsync = async (app:FastifyInstance) => 
{
    const svc = settingsService(app);

    app.get(
        '/:username',
        {
            schema: {
                tags : ['settings'],
                params: Type.Object({ username: Type.String() }),
                response: { 200: Settings, 404: ErrorResponse },
                summary: 'Get settings by username',
            }
        },
        async (req, reply) => {
            const { username } = req.params as { username: string };
            const row = svc.getByUsername(username);
            if (!row) return reply.status(404).send({error: 'settings not found'});
            return row;
        }
    );

    app.post
    (
        '/',
        {
            schema: {
              tags: ['settings'],
              body: UpsertSettingsBody,
              response: { 200: Settings, 404: ErrorResponse },
              summary: 'Create/update settings',
            },
        },
        async( req, reply) => {
            try{
                const body = req.body as 
                {
                    username: string;
                    languageCode?: string;
                    accentColor?: string;
                    backgroundTheme?: string;
                }
                const saved = svc.upsertFromStrings(body);
                return saved;
            }
            catch (e: any) {
                return reply.status(404).send({error: e.message ?? 'invalid settings payload' })
            }
        }
    );
};

export default plugin;