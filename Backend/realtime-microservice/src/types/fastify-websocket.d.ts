import 'fastify';
import { SocketStream } from '@fastify/websocket';

declare module 'fastify' {
  interface RouteShorthandOptions {
    websocket?: boolean;
  }

  interface FastifyInstance {
    get: {
      <T extends RouteGenericInterface = RouteGenericInterface>(
        path: string,
        opts: RouteShorthandOptions & { websocket: true },
        handler: (conn: SocketStream, request: FastifyRequest) => void
      ): void;
    };
  }
}
