const EventEmitter = require('events');
const WebSocket = require('ws');
let ws;

module.exports = {
    event: new EventEmitter(),
    data: null,
    startEvent: function (url, token, options = {}) {
        connectWebSocket(url, token, options, this);
    }
}

function connectWebSocket(url, token, options, context) {
    ws = new WebSocket(`${url}/?token=${token}&host=true`);

    ws.on('open', () => {
        if (options.log) console.log('WebSocket bağlantısı kuruldu.');
    });

    ws.on('message', (data) => {
        const json = JSON.parse(data.toString());
        if (!json.loadbalancer) return;
        delete json.loadbalancer;
        delete json.host;
        if(!options.sayIp) delete json.ip;
        if(!context.data) {
            context.event.emit('connected', json);
        } else if(context.data.url !== json.url) {
            context.event.emit('change', json);
        }
        context.data = json;
    });

    ws.on('close', (code, reason) => {
        if (options.log) console.log(`Connection closed. Code: ${code}, Reason: ${reason}`);
        reconnectTimeout = setTimeout(() => connectWebSocket(url, token, options, context), 2000);
    });

    ws.on('error', (error) => {
    });
}