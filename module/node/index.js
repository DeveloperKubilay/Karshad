const si = require('systeminformation');
const WebSocket = require('ws');


function plugin(fastify, opts, done) {
    let ws;
    let reconnectTimeout = null;

    function connectWebSocket() {
        ws = new WebSocket(`${opts.url}/?token=${opts.token}`);

        ws.on('open', () => {
            console.log('WebSocket bağlantısı kuruldu.');
            ws.send(JSON.stringify({ message: 'Merhaba sunucu!' }));
        });

        ws.on('message', (data) => {
            console.log('Sunucudan gelen mesaj:', data);
        });

        ws.on('close', (code, reason) => {
            console.log(`Bağlantı kapandı. Kod: ${code}, Sebep: ${reason}`);
            reconnectTimeout = setTimeout(connectWebSocket, 2000);
        });

        ws.on('error', (error) => {
            console.error('WebSocket hatası:', error);
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


    ws.on('open', () => {
        console.log('WebSocket bağlantısı kuruldu.');
        // Sunucuya mesaj gönder
        ws.send(JSON.stringify({ message: 'Merhaba sunucu!' }));
    });

    ws.on('message', (data) => {
        console.log('Sunucudan gelen mesaj:', data);
    });

    ws.on('close', (code, reason) => {
        console.log(`Bağlantı kapandı. Kod: ${code}, Sebep: ${reason}`);
    });

    ws.on('error', (error) => {
        console.error('WebSocket hatası:', error);
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