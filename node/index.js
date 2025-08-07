const fastify = require('fastify')()

fastify.register(require('../module'),{test:true});

fastify.get('/', async (request, reply) => {
    return { hello: 'world' };
});


fastify.listen({ port: 3000 });

console.log('Server listening on http://localhost:3000');