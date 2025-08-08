function plugin(wss, options) {
    var servers = {};
    const recentlyRedirected = new Map(); // Sunucuların yönlendirme zamanını tutar

    setInterval(() => {
        const now = Date.now();
        // 1 dakika (60000 ms) önce yönlendirilmiş sunucuları temizle
        for (const [ip, timestamp] of recentlyRedirected.entries()) {
            if (now - timestamp > 60000) {
                recentlyRedirected.delete(ip);
            }
        }

        const serverList = Object.entries(servers).map(([ip, server]) => {
            const lastStatus = server.status[server.status.length - 1];
            return {
                ip,
                ws: server.ws,
                cpu: lastStatus && typeof lastStatus.cpu === 'number' ? lastStatus.cpu : null
            };
        }).filter(s => !recentlyRedirected.has(s.ip));

        const idleServers = serverList
            .filter(s => s.cpu !== null && s.cpu < options.cpuMax)
            .sort((a, b) => a.cpu - b.cpu);

        const usedIdleServers = new Set(); 

        serverList.forEach(server => {
            if (server.cpu !== null && server.cpu > options.cpuMax) {
                const target = idleServers.find(s => s.ip !== server.ip && !usedIdleServers.has(s.ip));
                if (target) {
                    usedIdleServers.add(target.ip);
                    recentlyRedirected.set(target.ip, now); // Yönlendirme zamanını kaydet
                    server.ws.send(JSON.stringify({
                        loadbalancer: true,
                        redirect: target.ip
                    }));
                } else options.noServer ? options.noServer(servers, options.allowedIpaddrs) : null;
            }
        });
    }, 1000);

    wss.on('connection', async (ws, req) => {
        console.log('WebSocket bağlantısı kuruldu.');
        if (!req.url) {
            ws.close(4000, 'No URL');
            return;
        }

        const urlParams = new URLSearchParams(req.url.slice(req.url.indexOf('?') + 1));
        const token = urlParams.get('token');
        if (token !== options.token) {
            ws.close(4000, 'Invalid Token');
            return;
        }
        const ipaddr = req.socket.remoteAddress || req.socket.localAddress;
        if (!options.alllowedIpaddrs.includes(ipaddr)) {
            ws.close(4000, 'IP Address Not Allowed');
            return;
        }

        servers[ipaddr] = {
            ws: ws,
            status: []
        };

        ws.on('message', (data) => {
            try {
                const obj = JSON.parse(data);
                if (!obj.loadbalancer) return;
                delete obj.loadbalancer;
                if(servers[ipaddr].status.length > 200) {
                    servers[ipaddr].status.shift();
                }
                servers[ipaddr].status.push(obj);
            } catch (e) {
                console.log('Received data is not JSON:', data);
            }
        });

        ws.on('error', (error) => {
        });

        ws.on('close', (code, reason) => {
            servers = servers.filter(s => s.ipaddr !== ipaddr);
        });

    });
}

module.exports = plugin;