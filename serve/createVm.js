const servers = []
const config = require('./config.json');

//Servers
const Azure = require('./MachineCreates/azure');

let statusRef;
let allowedIpaddrsRef;

setInterval(() => {
    let dontCloseVm = false;
    if(!statusRef) return;
    Object.entries(statusRef).map(([ip, server]) => {
        const lastStatus = server.status[server.status.length - 1];
        if (lastStatus < config.CpuReleaseUsage.min) dontCloseVm = true;
    })
    if(dontCloseVm) return;
    const date = new Date();
    const aServer = servers.find(z=> z.time + config.CpuReleaseUsage.time > date);
    if(!aServer) return;
    aServer.serve.delete();
    servers.splice(servers.indexOf(aServer), 1);
}, 1000)


async function createVm(status, allowedIpaddrs) {
    console.log("DEBUG")

    statusRef = status || {};
    allowedIpaddrsRef = allowedIpaddrs || [];

    const availableServers = config.Machines.find(z =>
        servers.filter(y => y.serverConfig.type == z.type).length < z.count + 1
    )

    if (!availableServers || !availableServers.length) return;
    const serverConfig = availableServers[0];

    switch (serverConfig.type) {
        case 'azure':

            const serve = Azure.create(serverConfig);

            servers.push({
                serverConfig,
                serve,
                time: Date.now()
            });

            await serve;

            allowedIpaddrsRef.push(serve.ip);
            console.log(serve.url)
            
            break;
    }

}


module.exports = createVm
module.exports.default = createVm