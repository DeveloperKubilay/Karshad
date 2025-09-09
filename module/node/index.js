const si = require('systeminformation');
const WebSocket = require('ws');


function plugin(fastify, opts, done) {
    let ws;
    let reconnectTimeout = null;

    function connectWebSocket() {
        ws = new WebSocket(`${opts.url}/?token=${opts.token}`);

        ws.on('open', () => {
            console.log('WebSocket bağlantısı kuruldu.');
        });

        ws.on('message', (data) => {
            const json = JSON.parse(data.toString());
            if (!json.loadbalancer) return;
            if (json.redirect) opts.redirect(json.redirect);
        });

        ws.on('close', (code, reason) => {
            if (opts.log) console.log(`Connection closed. Code: ${code}, Reason: ${reason}`);
            reconnectTimeout = setTimeout(connectWebSocket, 2000);
        });

        ws.on('error', (error) => {
        });
    }

    connectWebSocket();

    let reqBytes = 0;
    let resBytes = 0;
    let reqCount = 0;

    fastify.addHook('onRequest', async (request, reply) => {
        reqCount++;

        const reqHeaders = JSON.stringify(request.headers);
        reqBytes += Buffer.byteLength(reqHeaders, 'utf8');

        request.raw.on('data', chunk => {
            reqBytes += chunk.length;
        });

        const originalWrite = reply.raw.write;
        const originalEnd = reply.raw.end;

        reply.raw.write = function (chunk, encoding, callback) {
            if (chunk) {
                resBytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding || 'utf8');
            }
            return originalWrite.call(this, chunk, encoding, callback);
        };

        reply.raw.end = function (chunk, encoding, callback) {
            if (chunk) {
                resBytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding || 'utf8');
            }
            return originalEnd.call(this, chunk, encoding, callback);
        };
    });

    const interval = setInterval(async () => {
        let cpu = await si.currentLoad();
        let mem = await si.mem();

        cpu = cpu.currentLoad.toFixed(2);
        mem = ((mem.active / mem.total) * 100).toFixed(2);


        ws?.send(JSON.stringify({
            loadbalancer: true,
            cpu: cpu,
            mem: mem,
            reqBytes: reqBytes,
            resBytes: resBytes,
            reqCount: reqCount
        }));

        reqCount = 0;
        reqBytes = 0;
        resBytes = 0;
    }, opts.Interval || 5000);

    fastify.addHook('onClose', async () => {
        clearInterval(interval);
    });

    done()
}
module.exports.default = plugin