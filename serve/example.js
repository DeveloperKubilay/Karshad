const azure = require('./MachineCreates');

async function example() {
    // İstediğin gibi kullanım!
    const machine = await azure.createInstance();
    console.log('Machine IP:', machine.ip);
    console.log('URL:', machine.url);
    
    // 5 dakika sonra sil
    setTimeout(() => {
        machine.delete();
    }, 5 * 60 * 1000);
}

example();
