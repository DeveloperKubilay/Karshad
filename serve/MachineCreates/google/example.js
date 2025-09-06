const Google = require('.');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

async function test() {
    const serve = await Google.create({
        "type": "Google",
       // "ProjectName": "false-chat",
        "env": "env.json",
        "template": "template.json",
        "count": 5
    });
    console.log(serve);
    //console.log(serve.ip);
    /*setTimeout(() => {
        console.log("Deleting instance...");
        serve.delete()
    }, 15 * 1000)*/
}


test()