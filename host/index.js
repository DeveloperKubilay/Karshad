const fastify = require('fastify')()
const cors = require('@fastify/cors')
const { host } = require('../module')

fastify.register(cors, {
    origin: 'http://localhost:5173'
})

host.event.on("change", (data) => {
    console.log("Host data changed:", data)
})

fastify.get('/Status', async (request, reply) => {
    reply.send(host.data)
})

fastify.get('/Redirect', async (request, reply) => {
    reply.redirect(host.data?.url)
})

fastify.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
    if (err) throw err
})