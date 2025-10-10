"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const PORT = Number(process.env.PORT ?? 3000);
async function main() {
    const app = await (0, app_1.buildApp)();
    try {
        await app.listen({ port: PORT, host: '0.0.0.0' });
        app.log.info(`game-microservice listening on ${PORT}`);
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=server.js.map