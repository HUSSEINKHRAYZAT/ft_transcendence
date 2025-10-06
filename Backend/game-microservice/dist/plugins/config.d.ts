export type AppConfig = {
    NODE_ENV: string;
    DB_FILE: string;
    PORT: number;
};
export declare const configPlugin: (app: import("fastify").FastifyInstance<import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>) => Promise<void>;
declare module 'fastify' {
    interface FastifyInstance {
        config: AppConfig;
    }
}
//# sourceMappingURL=config.d.ts.map