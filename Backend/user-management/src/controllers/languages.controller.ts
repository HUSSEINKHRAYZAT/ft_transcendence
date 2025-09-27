import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { settingsService } from '../services/settings.service';
import { LanguagesList } from '../schemas/languages.schema';

const plugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  const svc = settingsService(app);

  // GET /languages
  app.get(
    '/',
    {
      schema: {
        tags: ['languages'],
        response: { 200: LanguagesList },
        summary: 'List supported languages',
      },
    },
    async () => svc.listLanguages()
  );
};

export default plugin;
