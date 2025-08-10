const Azure = require('.');

async function test() {
    const serve = await Azure.create({
           "type": "Azure",
           "envPrefix":"AZURE_",
           "run":"../run.sh",
           "count": 5
       });
    console.log(serve);
    //console.log(serve.ip);
}

test()