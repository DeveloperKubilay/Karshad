const Azure = require('./azure/azure-machine');
require('dotenv').config({ path: '../.env' });

async function test() {
    const date = Date.now()
    const machine = await Azure.createInstance();
    console.log('🌐 URL:', machine.url);
    console.log("✅ Geçen süre:", Date.now() - date);

    // 5 dakika sonra sil
    setTimeout(() => {
        machine.delete();
    }, 5 * 60 * 1000);
}

test();

