const fastify = require('fastify')()
const { serve } = require('../module')
const { WebSocketServer } = require('ws')

const wss = new WebSocketServer({ noServer: true });

serve(wss,{
    token: "sacacascas",
    allownedIpaddrs: ['192.168.1.1']
})

fastify.listen({ port: 5000, host: '0.0.0.0' })