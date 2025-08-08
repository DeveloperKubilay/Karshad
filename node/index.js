const fastify = require('fastify')()
require('dotenv').config();

fastify.register(require('../module'),{
    url:process.env.WS_URL,
    token:process.env.WS_TOKEN
});

fastify.get('/', async (request, reply) => {
    return { hello: 'world' };
});


fastify.listen({ port: 3000 });

console.log('Server listening on http://localhost:3000');