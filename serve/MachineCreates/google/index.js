const { InstancesClient } = require('@google-cloud/compute');
const fs = require('fs');
const path = require('path');

class GoogleSystem {
    constructor() {
        const envPath = path.join(__dirname, 'machine', 'env.json');
        const envData = JSON.parse(fs.readFileSync(envPath, 'utf8'));
        this.projectId = envData.project_id;
        this.zone = process.env.GOOGLE_ZONE;
        this.client = new InstancesClient({ keyFilename: envPath });
        this.instanceName = null;
        this.publicIp = null;
    }

    static async create(config) {
        const instance = new GoogleSystem();
        const result = await instance.createInstance(config);
        return result;
    }

    async createInstance(config) {
        this.instanceName = `instance-${Date.now()}`;

        const templatePath = path.join(__dirname, 'machine', 'template.json');
        const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

        template.name = this.instanceName;

        const runShPath = path.join(__dirname, 'run.sh');
        let runShContent = fs.readFileSync(runShPath, 'utf8');

        let stopShPath = path.join(__dirname, 'stop.sh');
        let stopShContent = fs.existsSync(stopShPath) ? fs.readFileSync(stopShPath, 'utf8') : '';

        if (template.metadata && Array.isArray(template.metadata.items)) {
            template.metadata.items.push({ key: 'startup-script', value: runShContent });
            template.metadata.items.push({ key: 'shutdown-script', value: stopShContent });
        }

        const [response] = await this.client.insert({
            project: this.projectId,
            zone: this.zone,
            instanceResource: template,
        });

        console.log('VM oluşturuluyor...');

        await this.waitForInstance();

        return {
            ip: this.publicIp,
            resourceGroup: this.instanceName, // Google'da resource group yok, instance name kullanıyoruz
            url: `http://${this.publicIp}`,
            delete: () => this.delete()
        };
    }

    async waitForInstance() {
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
            try {
                const [instance] = await this.client.get({
                    project: this.projectId,
                    zone: this.zone,
                    instance: this.instanceName,
                });

                if (instance.status === 'RUNNING') {
                    const networkInterface = instance.networkInterfaces[0];
                    if (networkInterface && networkInterface.accessConfigs) {
                        this.publicIp = networkInterface.accessConfigs[0].natIP;
                        return;
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 10000));
                attempts++;
            } catch (error) {
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }

        throw new Error('VM başlatma timeout');
    }

    async delete() {
        await this.client.delete({
            project: this.projectId,
            zone: this.zone,
            instance: this.instanceName,
        });
    }
}

module.exports = GoogleSystem;