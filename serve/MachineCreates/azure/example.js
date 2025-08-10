const Azure = require('.');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

async function test() {
    const serve = await Azure.create({
           "envPrefix":"AZURE_",
           "run":"../run.sh",
           "machineType": "Standard_B2pts_v2",
           "location": "francecentral"
       });
    console.log(serve);
    setTimeout(()=>{
        serve.delete()
    },20000)
    //console.log(serve.ip);
}

test()