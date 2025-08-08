function plugin(wss, options) {
    var servers = {};
    const recentlyRedirected = new Map(); 

    function broadcastToDashboard(data) {
        wss.clients.forEach(client => {
            if(!client.dashboard) return;
            if (client.readyState === 1) {
                try {
                    client.send(JSON.stringify({
                        dashboard: true,
                        ...data
                    }));
                } catch (e) {
                }
            }
        });
    }

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
                cpu: lastStatus ? Number(lastStatus.cpu) : null,
                mem: lastStatus ? Number(lastStatus.mem) : null,
                reqCount: lastStatus ? Number(lastStatus.reqCount) : 0,
                reqBytes: lastStatus ? Number(lastStatus.reqBytes) : 0,
                resBytes: lastStatus ? Number(lastStatus.resBytes) : 0
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

        // Ortalama CPU, RAM, istek sayısı, alınan ve gönderilen KB bilgilerini hesapla
        const avgCpu = serverList.length > 0 ? 
            (serverList.reduce((sum, s) => sum + (s.cpu || 0), 0) / serverList.length).toFixed(2) : 0;
        const avgMem = serverList.length > 0 ?
            (serverList.reduce((sum, s) => sum + (s.mem || 0), 0) / serverList.length).toFixed(2) : 0;
        const totalReqCount = serverList.reduce((sum, s) => sum + s.reqCount, 0);
        const totalReqBytes = serverList.reduce((sum, s) => sum + s.reqBytes, 0);
        const totalResBytes = serverList.reduce((sum, s) => sum + s.resBytes, 0);

        broadcastToDashboard({
            serverCount: serverList.length,
            avgCpu: avgCpu,
            avgMem: avgMem,
            totalRequests: totalReqCount,
            dataReceived: (totalReqBytes / 1024).toFixed(2),
            dataSent: (totalResBytes / 1024).toFixed(2),
            servers: serverList.map(s => ({
                ip: s.ip,
                cpu: s.cpu,
                mem: s.mem,
                reqCount: s.reqCount,
                reqBytes: s.reqBytes,
                resBytes: s.resBytes
            }))
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
        const dashboard = urlParams.get('dashboard');
        if(dashboard) ws.dashboard = true;
        if (token !== options.token) {
            ws.close(4000, 'Invalid Token');
            return;
        }
        const ipaddr = req.socket.remoteAddress || req.socket.localAddress;
        if (!options.allowedIpaddrs.includes(ipaddr)) {
            ws.close(4000, 'IP Address Not Allowed');
            return;
        }

        ws.ipaddr = ipaddr;

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
            //    console.log('Received data is not JSON:', data.toString());
            }
        });

        ws.on('error', (error) => {
        });

        ws.on('close', (code, reason) => {
            delete servers[ipaddr]; // servers'ı doğru şekilde güncelle
        });

    });
}

module.exports = plugin;