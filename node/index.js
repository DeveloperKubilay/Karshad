const fastify = require('fastify')()
require('dotenv').config();

fastify.register(require('../module'), {
    url: process.env.WS_URL,
    token: process.env.WS_TOKEN,
    redirect: function (ipaddr) {//Boşta olan sunucu adresi söyler ve buraya gidin der
        console.log('Redirect to:', ipaddr);

        /*ipaddr example format
        { ip: '133.33.203.184', url: 'http://133.33.203.184' },
        {
          ip: '35.207.251.135',
          url: 'http://falsechat-1757427771193.test.com'
        },
        */
    }
});

fastify.get('/', async (request, reply) => {
    return { hello: 'world' };
});

const port = Math.floor(Math.random() * 1001) + 3000;
fastify.listen({ port });

console.log('Server listening on http://localhost:' + port);