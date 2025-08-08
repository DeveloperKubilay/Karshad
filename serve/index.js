const fastify = require('fastify')()
const { serve } = require('../module')
const WebSocket  = require('ws')
const createVm = require('../module/servecreateVm')
require('dotenv').config();

const wss = new WebSocket.Server({ server: fastify.server });

serve(wss, {
    token: process.env.WS_TOKEN,
    alllowedIpaddrs: ['127.0.0.1', '::1'],
    noServer: createVm
})

fastify.listen({ port: 5000, host: '0.0.0.0' })