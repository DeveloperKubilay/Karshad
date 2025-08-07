const EventEmitter = require('events');
let data = {}

module.exports = {
    event:new EventEmitter(),
    data: data
}

/*setInterval(() => {
    data.url ="http://localhost:5000/Status"
    module.exports.event.emit('change', data);
}, 1000);*/