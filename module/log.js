const fs = require("fs")

module.exports = new class {
    constructor(x) {
        this.logFile = x;
    }
    log(enabled, ...message) {
        if (!this.logFile || !enabled) return;
        fs.appendFileSync(this.logFile, `${new Date().toISOString()} - ${message.join(' ')}\n`);
    }
}