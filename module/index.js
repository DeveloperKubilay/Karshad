const fp = require('fastify-plugin')

module.exports = fp(require('./node'), {
        fastify: '5.x'
})

module.exports.default = require('./node')
module.exports.host = require('./host')
module.exports.serve = require('./serve')