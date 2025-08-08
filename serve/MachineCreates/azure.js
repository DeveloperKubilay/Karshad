const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { DefaultAzureCredential, ClientSecretCredential } = require('@azure/identity');
const { ResourceManagementClient } = require('@azure/arm-resources');
const fs = require('fs');
const https = require('https');

const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;

const location = process.env.AZURE_LOCATION || 'francecentral';

const templateFile = path.join(__dirname, 'azure', 'arm', 'template-fixed.json');
const parametersFile = path.join(__dirname, 'azure', 'arm', 'parameters-fixed.json');
const runScriptFile = path.join(__dirname, 'run.sh');

async function deploy() {
	// Kimlik bilgilerini başta kontrol et
	if (!tenantId || !clientId || !clientSecret || !subscriptionId) {
		throw new Error('AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET veya AZURE_SUBSCRIPTION_ID eksik!');
	}
	const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
	const client = new ResourceManagementClient(credential, subscriptionId);

	// Template ve parametreleri oku
	const template = JSON.parse(fs.readFileSync(templateFile, 'utf8'));
	const parametersTemplate = JSON.parse(fs.readFileSync(parametersFile, 'utf8')).parameters;
	
	// run.sh dosyasını oku
	const runScript = fs.readFileSync(runScriptFile, 'utf8').trim();
	
	// Random grup ID oluştur
	const groupId = Math.random().toString(36).substring(2, 8).toUpperCase();
	const resourceGroupName = `Karshad-${groupId}`;
	
	// Cloud-init script oluştur
	const cloudInitScript = `#cloud-config
runcmd:
  - chmod +x /tmp/run.sh
  - bash /tmp/run.sh
write_files:
  - path: /tmp/run.sh
    content: |
${runScript.split('\n').map(line => '      ' + line).join('\n')}
    permissions: '0755'`;
	
	// Template'e customData ekle
	template.resources.forEach(resource => {
		if (resource.type === 'Microsoft.Compute/virtualMachines') {
			resource.properties.osProfile.customData = Buffer.from(cloudInitScript).toString('base64');
		}
	});
	
	// .env'den değerleri parameters'a aktar
	const parameters = {
		...parametersTemplate,
		location: { value: location },
		adminUsername: { value: process.env.machineName },
		adminPassword: { value: process.env.machinePass }
	};

	// Resource Group durumunu kontrol et
	try {
		const existingRG = await client.resourceGroups.get(resourceGroupName);
		if (existingRG.properties?.provisioningState === 'Deleting') {
			throw new Error(`Resource Group '${resourceGroupName}' şu anda silinme durumunda. Farklı bir isim kullanın.`);
		}
		console.log('✅ Resource Group mevcut ve kullanılabilir durumda');
	} catch (error) {
		if (error.statusCode === 404) {
			console.log('ℹ️ Resource Group bulunamadı, yeni oluşturulacak');
		} else {
			throw error;
		}
	}

	// Resource Group oluştur (varsa hata vermez)
	console.log('🔨 Resource Group oluşturuluyor/güncelleniyor:', resourceGroupName);
	await client.resourceGroups.createOrUpdate(resourceGroupName, { location });

	// Deployment başlat
	const deploymentName = 'vm-deployment-' + Date.now();
	console.log('Deployment başlatılıyor:', deploymentName);
	
	try {
		// Access token al
		const token = await credential.getToken('https://management.azure.com/.default');
		console.log('Access token alındı');
		
		// REST API ile deployment yap
		const deploymentUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourcegroups/${resourceGroupName}/providers/Microsoft.Resources/deployments/${deploymentName}?api-version=2021-04-01`;
		
		const deploymentBody = JSON.stringify({
			properties: {
				mode: 'Incremental',
				template: template,
				parameters: parameters
			}
		});
		
		console.log('Deployment URL:', deploymentUrl);
		console.log('Deployment başlatılıyor...');
		
		const result = await makeRestCall(deploymentUrl, 'PUT', deploymentBody, token.token);
		console.log('Deployment başarıyla oluşturuldu');
		console.log('Deployment sonucu:', result);
		
		// Deployment durumunu kontrol et
		if (result.properties?.provisioningState === 'Accepted') {
			console.log('\n🚀 Deployment kabul edildi ve işleniyor...');
			console.log('📍 Deployment ID:', result.id);
			console.log('⏰ Başlangıç zamanı:', result.properties.timestamp);
			console.log('🏷️ Resource Group:', resourceGroupName);
			console.log('\n💡 Deployment durumunu kontrol etmek için Azure portalını ziyaret edebilirsiniz.');
			
			// 5 dakika sonra resource group'u sil
			console.log('⏰ 5 dakika sonra otomatik silme başlatılacak...');
			setTimeout(async () => {
				try {
					await deleteResourceGroup(resourceGroupName);
				} catch (deleteError) {
					console.error('❌ Silme hatası:', deleteError.message);
				}
			}, 5 * 60 * 1000); // 5 dakika = 300,000 ms
		}
		
	} catch (error) {
		console.error('Deployment hatası:', error.message);
		console.error('Hata detayları:', error);
		throw error;
	}
}

// Resource Group silme fonksiyonu
async function deleteResourceGroup(resourceGroupName) {
	try {
		console.log('\n🗑️ Resource Group siliniyor:', resourceGroupName);
		
		const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
		const token = await credential.getToken('https://management.azure.com/.default');
		
		const deleteUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourcegroups/${resourceGroupName}?api-version=2021-04-01`;
		
		await makeRestCall(deleteUrl, 'DELETE', '', token.token);
		console.log('✅ Resource Group silme işlemi başlatıldı');
		console.log('🎉 Silme request gönderildi, Azure tarafından işlenecek');
		
	} catch (error) {
		console.error('❌ Resource Group silme hatası:', error.message);
		throw error;
	}
}

// Deployment durumunu kontrol etmek için yardımcı fonksiyon
async function checkDeploymentStatus(deploymentName, resourceGroupName) {
	try {
		const credential = new ClientSecretCredential(process.env.AZURE_TENANT_ID, process.env.AZURE_CLIENT_ID, process.env.AZURE_CLIENT_SECRET);
		const token = await credential.getToken('https://management.azure.com/.default');
		
		const statusUrl = `https://management.azure.com/subscriptions/${process.env.AZURE_SUBSCRIPTION_ID}/resourcegroups/${resourceGroupName}/providers/Microsoft.Resources/deployments/${deploymentName}?api-version=2021-04-01`;
		
		const result = await makeRestCall(statusUrl, 'GET', '', token.token);
		
		console.log('\n📊 Deployment Durumu:');
		console.log('🔄 Durum:', result.properties?.provisioningState);
		console.log('⏱️ Süre:', result.properties?.duration);
		
		if (result.properties?.provisioningState === 'Succeeded') {
			console.log('✅ Deployment başarıyla tamamlandı!');
			if (result.properties?.outputs) {
				console.log('📤 Çıktılar:', result.properties.outputs);
			}
		} else if (result.properties?.provisioningState === 'Failed') {
			console.log('❌ Deployment başarısız!');
			if (result.properties?.error) {
				console.log('🚨 Hata:', result.properties.error);
			}
		} else {
			console.log('⏳ Deployment hala devam ediyor...');
		}
		
		return result;
	} catch (error) {
		console.error('Durum kontrol hatası:', error.message);
		throw error;
	}
}

// REST API çağrısı için yardımcı fonksiyon
function makeRestCall(url, method, body, token) {
	return new Promise((resolve, reject) => {
		const options = {
			method: method,
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(body)
			}
		};
		
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
		
		req.write(body);
		req.end();
	});
}

deploy().catch(err => {
	console.error('Hata:', err.message);
	process.exit(1);
});
