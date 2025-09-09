const servers = []
const config = require('./config.json');
const { addVm, deleteVm } = require('./Cloudflare');
const logger = require('../module/log.js')
const fs = require('fs');
const logg = new logger(config.log.file);

//Servers
const serverTypes = {};
fs.readdirSync('./serve/MachineCreates').forEach(folder => {
    serverTypes[folder] = require(`./MachineCreates/${folder}`);
})

let statusRef;
let allowedIpaddrsRef;
let nextDeleteTime = 0; // Sonraki silme işlemi için zaman kaydı

setInterval(() => {
    let dontCloseVm = false;
    if (!statusRef) return;
    const cpuUsages = Object.entries(statusRef).map(([ip, server]) => {
        const lastStatus = server.status[server.status.length - 1];
        if (!lastStatus) return 0;
        return Number(lastStatus.cpu) || 0;
    });
    const avgCpuUsage = cpuUsages.reduce((sum, usage) => sum + usage, 0) / cpuUsages.length;
    if (avgCpuUsage > config.CpuReleaseUsage.min) dontCloseVm = true;
    if (dontCloseVm) return; //cpu kullanımı hala fazla ise bırakılıyor

    const date = Date.now();
    if (date < nextDeleteTime) return; // Silme zamanı gelmediyse çık

    const aServer = servers.find(z => z.time + config.CpuReleaseUsage.MinVmDuration < date);
    if (!aServer) return;

    logg.log(config.log.vmInfo, "Machine deleted", aServer.serve.ip, aServer.serve.url);

    deleteVm(aServer.serve.rule);
    aServer.serve.delete();
    if (allowedIpaddrsRef) {
        const index = allowedIpaddrsRef.findIndex(z => z.ip === aServer.serve.ip);
        if (index !== -1) allowedIpaddrsRef.splice(index, 1);
    }
    servers.splice(servers.indexOf(aServer), 1);

    console.log(
        "debug",
        servers,
        allowedIpaddrsRef
    )

    nextDeleteTime = date + config.CpuReleaseUsage.nextRemoveVmTimeout; // Yeni silme zamanı ayarla
}, 1000)


async function createVm(status, allowedIpaddrs) {
    statusRef = status || {};
    allowedIpaddrsRef = allowedIpaddrs || [];

    console.log("Machine creating")

    const serverConfig = config.Machines.find(z =>
        (servers.filter(y => y.serverConfig.type == z.type)?.length || 0) < z.count + 1
    );

    logg.log(config.log.cpuInfo, "Machine creating", serverConfig.type)

    const serve = await serverTypes[serverConfig.type].create(serverConfig);

    servers.push({//Burada olmasını sebebi count'u aşmaması
        serverConfig,
        serve,
        time: Date.now()
    });

    await serve;

    serve.rule = await addVm(serve.ip, serve.resourceGroup)
    serve.url = config.domain.replace("{server}", serve.rule.name);
    allowedIpaddrsRef.push({
        ip: serve.ip,
        url: serve.url
    });
    logg.log(config.log.vmInfo, "Machine created", serve.ip, serve.url);
    console.log("Machine created", serve.ip, serve.url);

}


module.exports = createVm
module.exports.default = createVm