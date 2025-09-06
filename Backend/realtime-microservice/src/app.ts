import Fastify from 'fastify';
import gameRoutes from './routes/game.routes';
import swagger from './plugins/swagger';

const app = Fastify();

app.register(swagger);
app.register(gameRoutes);

export default app;
