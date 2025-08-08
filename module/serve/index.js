

function plugin(wss, options) {
    const servers = []

    wss.on('connection', async (ws, req) => {
        console.log('WebSocket bağlantısı kuruldu.');
        if (!req.url) {
            ws.close(4000, 'No URL');
            return;
        }

        const urlParams = new URLSearchParams(req.url.slice(req.url.indexOf('?') + 1));
        const token = urlParams.get('token');
        if(token !== options.token) {
            ws.close(4000, 'Invalid Token');
            return;
        }
        const ipaddr = req.socket.remoteAddress || req.socket.localAddress;
        if(!options.alllowedIpaddrs.includes(ipaddr)) {
            ws.close(4000, 'IP Address Not Allowed');
            return;
        }


        ws.on('message', (data) => {
            try{
                const obj = JSON.parse(data);
                console.log(obj);
                if(!data.loadbalancer) return;
                
                
            }catch(e){
                console.log('Received data is not JSON:', data);
            }
        });

        ws.on('error', (error) => {
        });

    })


}

module.exports = plugin