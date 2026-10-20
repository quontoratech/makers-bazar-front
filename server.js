const { createServer } = require('node:http');
const { createRequire } = require('node:module');
const path = require('node:path');

const port = Number(process.env.PORT ?? 3000);
const hostname = '0.0.0.0';
const appDirectory = path.join(__dirname, 'apps/web');
const requireFromApp = createRequire(path.join(appDirectory, 'package.json'));
let requestHandler = (_request, response) => {
    if (response.headersSent) return response.end();
    response.writeHead(503, {
        'content-type': 'application/json; charset=utf-8',
        'retry-after': '5',
    });
    response.end(JSON.stringify({ status: 'starting' }));
};

const server = createServer((request, response) => requestHandler(request, response));

server.listen(port, hostname, async () => {
    try {
        const next = requireFromApp('next');
        const app = next({
            dev: false,
            dir: appDirectory,
            hostname,
            port,
        });
        await app.prepare();
        requestHandler = app.getRequestHandler();
        console.info(`The Makers Bazar frontend is ready on port ${port}`);
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
        server.close(() => process.exit(1));
    }
});

server.on('error', error => {
    console.error(error);
    process.exit(1);
});
