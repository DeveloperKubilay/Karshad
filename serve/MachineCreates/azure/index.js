const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const AzureSystem = {
    subscriptionId: null,
    tenantId: null,
    clientId: null,
    clientSecret: null,
    location: null,
    resourceGroupName: null,
    deploymentName: null,
    publicIp: null,
    token: null,
    runScriptPath: null,

    init(config) {
        const prefix = config.envPrefix;
        this.subscriptionId = process.env[`${prefix}SUBSCRIPTION_ID`];
        this.tenantId = process.env[`${prefix}TENANT_ID`];
        this.clientId = process.env[`${prefix}CLIENT_ID`];
        this.clientSecret = process.env[`${prefix}CLIENT_SECRET`];
        this.location = process.env[`${prefix}LOCATION`] || 'francecentral';
        this.runScriptPath = config.run;
    },

    async getAccessToken() {
        const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
        const tokenData = new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            scope: 'https://management.azure.com/.default',
            grant_type: 'client_credentials'
        });

        const response = await axios.post(tokenUrl, tokenData);
        this.token = response.data.access_token;
        return this.token;
    },

    generateResourceGroupName() {
        const groupId = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.resourceGroupName = `Karshad-${groupId}`;
        return this.resourceGroupName;
    },

    getTemplate() {
        const templatePath = path.join(__dirname, 'machine', 'template.json');
        return JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    },

    getParameters() {
        const parametersPath = path.join(__dirname, 'machine', 'parameters.json');
        const parametersTemplate = JSON.parse(fs.readFileSync(parametersPath, 'utf8')).parameters;

        return {
            ...parametersTemplate,
            location: { value: this.location },
            adminUsername: { value: process.env.machineName },
            adminPassword: { value: process.env.machinePass }
        };
    },

    getCloudInitScript() {
        const runScriptPath = path.join(__dirname, this.runScriptPath);
        const runScript = fs.readFileSync(runScriptPath, 'utf8').trim();

        return `#cloud-config
runcmd:
  - chmod +x /tmp/run.sh
  - bash /tmp/run.sh
write_files:
  - path: /tmp/run.sh
    content: |
${runScript.split('\n').map(line => '      ' + line).join('\n')}
    permissions: '0755'`;
    },

    async createResourceGroup() {
        const url = `https://management.azure.com/subscriptions/${this.subscriptionId}/resourcegroups/${this.resourceGroupName}?api-version=2021-04-01`;

        await axios.put(url, {
            location: this.location
        }, {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
    },

    async deployResources() {
        const template = this.getTemplate();
        const parameters = this.getParameters();
        const cloudInitScript = this.getCloudInitScript();

        template.resources.forEach(resource => {
            if (resource.type === 'Microsoft.Compute/virtualMachines') {
                resource.properties.osProfile.customData = Buffer.from(cloudInitScript).toString('base64');
            }
        });

        this.deploymentName = 'vm-deployment-' + Date.now();
        const url = `https://management.azure.com/subscriptions/${this.subscriptionId}/resourcegroups/${this.resourceGroupName}/providers/Microsoft.Resources/deployments/${this.deploymentName}?api-version=2021-04-01`;

        const response = await axios.put(url, {
            properties: {
                mode: 'Incremental',
                template: template,
                parameters: parameters
            }
        }, {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });

        return response.data;
    },

    async getPublicIP() {
        const url = `https://management.azure.com/subscriptions/${this.subscriptionId}/resourceGroups/${this.resourceGroupName}/providers/Microsoft.Network/publicIPAddresses/Karshad-ip?api-version=2021-04-01`;

        try {
            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            this.publicIp = response.data.properties.ipAddress;
            return this.publicIp;
        } catch (error) {
            return null;
        }
    },

    async waitForDeployment() {
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
            try {
                const ip = await this.getPublicIP();
                if (ip) {
                    this.publicIp = ip;
                    return ip;
                }
                await new Promise(resolve => setTimeout(resolve, 10000));
                attempts++;
            } catch (error) {
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }

        throw new Error('Deployment timeout');
    },

    async delete(resourceGroupName = this.resourceGroupName) {
        if (!this.token) {
            throw new Error('Authentication token is missing. Please ensure you have called getAccessToken().');
        }

        if (!resourceGroupName) {
            throw new Error('Resource group name is missing. Please provide a valid resource group name.');
        }

        const url = `https://management.azure.com/subscriptions/${this.subscriptionId}/resourcegroups/${resourceGroupName}?api-version=2021-04-01`;

        await axios.delete(url, {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });

    },

    async createInstance(config) {
        try {
            this.init(config);
            await this.getAccessToken();
            this.generateResourceGroupName();
            await this.createResourceGroup();
            const deployResult = await this.deployResources();
            await this.waitForDeployment();

            return {
                ip: this.publicIp,
                resourceGroup: this.resourceGroupName,
                url: `http://${this.publicIp}`,
                delete: () => this.delete()
            };

        } catch (error) {
            console.error('❌ Hata:', error.message);
            throw error;
        }
    }
};

module.exports = AzureSystem;
