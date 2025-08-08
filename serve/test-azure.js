const Azure = require('./MachineCreates/azure');
require('dotenv').config();
const config = require('./config.json');
const axios = require('axios');

async function waitForMachine(url) {
    const maxRetries = 30; // Maksimum deneme sayısı (örneğin 30 kez dene)
    const retryInterval = 5000; // Her deneme arası bekleme süresi (5 saniye)

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 URL'ye erişim denemesi (${attempt}/${maxRetries})...`);
            await axios.get(url);
            console.log("✅ URL'ye erişim başarılı!");
            return Date.now();
        } catch (error) {
            console.log("❌ URL'ye erişim başarısız, tekrar denenecek...");
            await new Promise(resolve => setTimeout(resolve, retryInterval));
        }
    }

    throw new Error("Makineye erişim sağlanamadı, maksimum deneme sayısına ulaşıldı.");
}

async function test() {
    const date = Date.now();
    const machine = await Azure.createInstance(config.Machines[0]);
    console.log('🌐 URL:', machine.url);

    const machineCreationTime = Date.now() - date;
    console.log("✅ Makine oluşturma süresi:", machineCreationTime);

    try {
        const accessTime = await waitForMachine(machine.url);
        const totalElapsedTime = accessTime - date;
        console.log("✅ Toplam geçen süre:", totalElapsedTime);
    } catch (error) {
        console.error("❌ Makineye erişim sağlanamadı:", error.message);
    }

    // 5 dakika sonra sil
    setTimeout(() => {
        machine.delete();
    }, 2 * 60 * 1000);
}

test();