const fastify = require('fastify')()
const { serve } = require('../module')
const WebSocket  = require('ws')
const createVm = require('../module/servecreateVm')
require('dotenv').config();
const config = require('./config.json');

const wss = new WebSocket.Server({ server: fastify.server });

serve(wss, {
    token: process.env.WS_TOKEN,
    allowedIpaddrs: config.allowedIpaddrs,
    noServer: createVm,
    cpuMax: config.CpuReleaseUsage.max,
})

fastify.listen({ port: 5000, host: '0.0.0.0' })