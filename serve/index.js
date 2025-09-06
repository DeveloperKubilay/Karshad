const fastify = require('fastify')()
require('dotenv').config();
const { serve } = require('../module')
const WebSocket  = require('ws')
const createVm = require('./createVm')
const cloudflare = require('./Cloudflare')
const path = require('path')
const fs = require('fs')
const config = require('./config.json');

const wss = new WebSocket.Server({ server: fastify.server });

fastify.get('/', async (request, reply) => {
    try {
        const dashboardHtml = fs.readFileSync(path.join(__dirname, 'dashboard.html'), 'utf8')
        
        const htmlWithToken = dashboardHtml.replace(
            'your_token', 
            process.env.WS_TOKEN
        )
        
        reply.type('text/html').send(htmlWithToken)
    } catch (error) {
        reply.code(500).send({ error: 'Dashboard dosyası bulunamadı' })
    }
})


serve(wss, {
    token: process.env.WS_TOKEN,
    noServer: createVm,
    cloudflare: cloudflare,
    config: config
})

fastify.listen({ port: 5000, host: '0.0.0.0' })
console.log('Server listening on http://localhost:5000');