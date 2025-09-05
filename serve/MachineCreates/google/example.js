const Google = require('.');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

async function test() {
    const config = {
        envPrefix: "GOOGLE_",
        run: "./run.sh"
    };
    const serve = await Google.create(config);
    console.log(serve);
    //console.log(serve.ip);
}

test()