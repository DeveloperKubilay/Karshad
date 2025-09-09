const fastify = require('fastify')()
const { host } = require('../module')
require('dotenv').config()

host.startEvent(process.env.WS_URL, process.env.TOKEN);
host.event.on("change", (data) => {
    console.log("Host data changed:", data)
    //data
    //{ url: 'http://147.69.131.113' }
})

fastify.get('/Status', async (request, reply) => {
    reply.send(host.data)
})

fastify.get('/Redirect', async (request, reply) => {
    reply.redirect(host.data?.url)
})

host.event.on("connected", (data) => {
    console.log("Host started 0.0.0.0:3000")
    fastify.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
        if (err) throw err
    })
})
