const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { ClientSecretCredential } = require('@azure/identity');
const https = require('https');

const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;

// Resource group adı
const resourceGroupName = 'Karshad_group_v2';

// REST API çağrısı için yardımcı fonksiyon
function makeRestCall(url, method, body, token) {
	return new Promise((resolve, reject) => {
		const options = {
			method: method,
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		};
		
		if (body) {
			options.headers['Content-Length'] = Buffer.byteLength(body);
		}
		
		const req = https.request(url, options, (res) => {
			let data = '';
			res.on('data', (chunk) => {
				data += chunk;
			});
			
			res.on('end', () => {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					try {
						resolve(JSON.parse(data));
					} catch (e) {
						resolve(data);
					}
				} else {
					reject(new Error(`HTTP ${res.statusCode}: ${data}`));
				}
			});
		});
		
		req.on('error', (error) => {
			reject(error);
		});
		
		if (body) {
			req.write(body);
		}
		req.end();
	});
}

async function checkResourceGroup() {
	try {
		const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
		const token = await credential.getToken('https://management.azure.com/.default');
		
		console.log('🔍 Resource Group durumu kontrol ediliyor...\n');
		
		// 1. Resource Group'taki tüm kaynakları listele
		const resourcesUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/resources?api-version=2021-04-01`;
		const resources = await makeRestCall(resourcesUrl, 'GET', '', token.token);
		
		console.log('📦 Mevcut Kaynaklar:');
		resources.value.forEach(resource => {
			console.log(`  ✅ ${resource.type} - ${resource.name} (${resource.properties?.provisioningState || 'Unknown'})`);
		});
		
		console.log('\n📋 Beklenen Kaynaklar:');
		console.log('  🔘 Microsoft.Network/networkSecurityGroups - Karshad-nsg');
		console.log('  🔘 Microsoft.Network/virtualNetworks - Karshad-vnet');
		console.log('  🔘 Microsoft.Compute/virtualMachines - Karshad');
		console.log('  🔘 Microsoft.Network/publicIPAddresses - Karshad-ip');
		console.log('  🔘 Microsoft.Network/networkInterfaces - karshad391');
		
		// 2. Son deployment durumunu kontrol et
		console.log('\n🚀 Son Deploymentlar:');
		const deploymentsUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourcegroups/${resourceGroupName}/providers/Microsoft.Resources/deployments?api-version=2021-04-01`;
		const deployments = await makeRestCall(deploymentsUrl, 'GET', '', token.token);
		
		deployments.value.slice(0, 3).forEach(deployment => {
			console.log(`  📍 ${deployment.name}`);
			console.log(`     Durum: ${deployment.properties.provisioningState}`);
			console.log(`     Zaman: ${deployment.properties.timestamp}`);
			console.log(`     Süre: ${deployment.properties.duration || 'Devam ediyor'}`);
			
			if (deployment.properties.error) {
				console.log(`     ❌ Hata: ${deployment.properties.error.message}`);
			}
			console.log('');
		});
		
		// 3. En son deployment'ın detaylarını al
		if (deployments.value.length > 0) {
			const latestDeployment = deployments.value[0];
			console.log(`📊 En Son Deployment Detayları: ${latestDeployment.name}`);
			
			if (latestDeployment.properties.provisioningState === 'Running') {
				console.log('⏳ Deployment hala devam ediyor...');
				console.log('💡 Lütfen birkaç dakika bekleyip tekrar kontrol edin.');
			} else if (latestDeployment.properties.provisioningState === 'Failed') {
				console.log('❌ Deployment başarısız oldu!');
				if (latestDeployment.properties.error) {
					console.log('🚨 Hata Detayları:', JSON.stringify(latestDeployment.properties.error, null, 2));
				}
			} else if (latestDeployment.properties.provisioningState === 'Succeeded') {
				console.log('✅ Deployment başarıyla tamamlandı!');
				
				// Outputs'ları göster
				if (latestDeployment.properties.outputs) {
					console.log('📤 Deployment Çıktıları:', JSON.stringify(latestDeployment.properties.outputs, null, 2));
				}
			}
		}
		
	} catch (error) {
		console.error('❌ Hata:', error.message);
		process.exit(1);
	}
}

checkResourceGroup();
