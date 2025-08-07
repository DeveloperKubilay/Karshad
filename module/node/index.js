const si = require('systeminformation');


function plugin(fastify, opts, done) {
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


   /* const interval = setInterval(async () => {
        let cpu = await si.currentLoad();
        let mem = await si.mem();

        cpu = cpu.currentLoad.toFixed(2);
        mem = ((mem.active / mem.total) * 100).toFixed(2);

        console.log(`
            Req Bytes: ${reqBytes} bytes,
            Res Bytes: ${resBytes} bytes,
            Req Count: ${reqCount}`);

            console.log(`⚙️ CPU Kullanımı: ${cpu} %`);
            console.log(`💾 RAM Kullanımı: ${mem} %`);

        reqCount = 0;
        reqBytes = 0;
        resBytes = 0;
    }, 1000);*/

    fastify.addHook('onClose', async () => {
        clearInterval(interval);
    });

    done()
}
module.exports.default = plugin