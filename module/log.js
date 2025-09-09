const fs = require("fs")
const path = require("path")

module.exports = class {
    constructor(x) {
        this.logFile = path.join(process.cwd(), x);
    }
    log(enabled, ...message) {
        if (!this.logFile || !enabled) return;
        fs.appendFileSync(this.logFile, `${new Date().toISOString()} - ${message.join(' ')}\n`);
    }
    newSession() {
        if (!this.logFile) return;
        fs.appendFileSync(this.logFile, `\n\n${new Date().toISOString()} - New session started\n`);
    }
}