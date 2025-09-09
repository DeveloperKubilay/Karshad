const fs = require('fs');
const logger = require('../log.js')

function plugin(wss, options) {
    const logg = new logger(options.config.log.file);
    logg.newSession();

    var servers = {};
    const recentlyRedirected = new Map();
    let VmCreatedAt = null;
    let requestCounts = [];
    let attackModeActive = false;
    let attackModeActivatedAt = null;

    function broadcastToDashboard(type, data) {
        wss.clients.forEach(client => {
            if (!client[type]) return;
            if (client.readyState === 1) {
                try {
                    client.send(JSON.stringify({
                        [type]: true,
                        loadbalancer: true,
                        ...data
                    }));
                } catch (e) { }
            }
        });
    }


    setInterval(() => {
        const now = Date.now();
        // yönlendirilmiş sunucuları temizle
        for (const [ip, timestamp] of recentlyRedirected.entries()) {
            if (now - timestamp > options.config.CpuReleaseUsage.RoutingDelay) {
                recentlyRedirected.delete(ip);
            }
        }

        const serverList = Object.entries(servers).map(([ip, server]) => {
            if (server.ws.dashboard) return null;
            if (server.ws.host) return null;
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
        }).filter(z => z)

        const idleServers = serverList //boşta olan sunucular
            .filter(s => s.cpu !== null && s.cpu < options.config.CpuReleaseUsage.max)
            .sort((a, b) => a.cpu - b.cpu);

        const filteredServers = serverList.filter(s => !recentlyRedirected.has(s.ip));//Max geçmiş sunucular
        for (let i = 0; i < filteredServers.length; i++) {
            const server = filteredServers[i];//Max geçmiş sunucu
            if (server.cpu !== null && server.cpu > options.config.CpuReleaseUsage.prepare_threshold) {
                const target = idleServers.find(s => s.ip !== server.ip && !recentlyRedirected.has(s.ip));
                if (target) {
                    recentlyRedirected.set(target.ip, now);
                    recentlyRedirected.set(server.ip, now);
                    server.ws.send(JSON.stringify({
                        loadbalancer: true,
                        redirect: options.config.allowedIpaddrs.find(z => z.ip === target.ip)
                    }));
                }
            }
        }

        const nowIdleServers = (idleServers.find(s => !recentlyRedirected.has(s.ip)) || idleServers[0])?.ip;
        if (nowIdleServers) {
            broadcastToDashboard("host", {
                ip: nowIdleServers,
                url: options.config.allowedIpaddrs.find(z => z.ip === nowIdleServers)?.url
            });
        }


        for (const server of serverList) {
            if (server.cpu >= options.config.CpuReleaseUsage.max) {
                if (!VmCreatedAt || VmCreatedAt < now - options.config.CpuReleaseUsage.CreateVmTimeout) {
                    options?.createVm(servers, options.config.allowedIpaddrs);
                    VmCreatedAt = now;
                    break;
                }
            }
        }

        // Ortalama CPU, RAM, istek sayısı, alınan ve gönderilen KB bilgilerini hesapla
        const avgCpu = serverList.length > 0 ?
            (serverList.reduce((sum, s) => sum + (s.cpu || 0), 0) / serverList.length).toFixed(2) : 0;
        const avgMem = serverList.length > 0 ?
            (serverList.reduce((sum, s) => sum + (s.mem || 0), 0) / serverList.length).toFixed(2) : 0;
        const totalReqCount = serverList.reduce((sum, s) => sum + s.reqCount, 0);
        const totalReqBytes = serverList.reduce((sum, s) => sum + s.reqBytes, 0);
        const totalResBytes = serverList.reduce((sum, s) => sum + s.resBytes, 0);

        // İstek sayısı analizi
        requestCounts.push(totalReqCount);
        if (requestCounts.length > 200) {
            requestCounts.shift();
        }

        if (requestCounts.length === 200) {
            const avgRequests = requestCounts.reduce((sum, count) => sum + count, 0) / requestCounts.length;
            if (!attackModeActive && avgRequests > options.config.UnderAttack.minRequests && totalReqCount > avgRequests * options.config.UnderAttack.thresholdIncrease) {
                options.cloudflare.UnderAttackMode(true);
                attackModeActive = true;
                logg.log(options.config.log.attackInfo, 'Under Attack Mode activated');
                attackModeActivatedAt = now;
            }
        }

        // Attack mode kapatma kontrolü
        if (attackModeActive && attackModeActivatedAt && (now - attackModeActivatedAt > options.config.UnderAttack.minDuration)) { // Süre geçti mi?
            const avgRequests = requestCounts.reduce((sum, count) => sum + count, 0) / requestCounts.length;
            if (totalReqCount <= avgRequests * options.config.UnderAttack.thresholdDecrease) {
                options.cloudflare.UnderAttackMode(false);
                attackModeActive = false;
                console.log('Under Attack Mode deactivated');
                logg.log(options.config.log.attackInfo, 'Under Attack Mode deactivated');
                attackModeActivatedAt = null;
            }
        }


        broadcastToDashboard("dashboard", {
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
    }, options.Interval || 1000);

    wss.on('connection', async (ws, req) => {
        if(options.config.log.debug) console.log('WebSocket bağlantısı kuruldu.');
        if (!req.url) {
            ws.close(4000, 'No URL');
            return;
        }

        const urlParams = new URLSearchParams(req.url.slice(req.url.indexOf('?') + 1));
        const token = urlParams.get('token');
        const dashboard = urlParams.get('dashboard');
        const host = urlParams.get('host');
        if (dashboard) ws.dashboard = true;
        if (host) ws.host = true;
        if (token !== options.token) {
            ws.close(4000, 'Invalid Token');
            return;
        }
        var ipaddr = req.socket.remoteAddress || req.socket.localAddress;
        if (!options.config.allowedIpaddrs.find(z => z.ip === ipaddr)) {
            ws.close(4000, 'IP Address Not Allowed');
            return;
        }

        if (process.env.KARSHARD_DEVMODE) {
            ipaddr = Array(4).fill(0).map(() => Math.floor(Math.random() * 256)).join('.');
            options.config.allowedIpaddrs.push({ ip: ipaddr, url: `http://${ipaddr}` });
        }
        ws.ipaddr = ipaddr;

        if (servers[ipaddr]) {
            servers[ipaddr].ws?.close()
            delete servers[ipaddr]
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
                if (servers[ipaddr].status.length > 200) {
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