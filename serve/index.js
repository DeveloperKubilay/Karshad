const fastify = require('fastify')()
const { serve } = require('../module')
const WebSocket  = require('ws')
require('dotenv').config();

const wss = new WebSocket.Server({ server: fastify.server });

serve(wss, {
    token: process.env.WS_TOKEN,
    alllowedIpaddrs: ['127.0.0.1', '::1']
})

fastify.listen({ port: 5000, host: '0.0.0.0' })