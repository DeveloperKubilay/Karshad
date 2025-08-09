require('dotenv').config({ path: '../.env' });

const Cloudflare = require("cloudflare");
const zone_id = process.env.CLOUDFLARE_ZONE_ID;
const client = new Cloudflare({
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
});


async function enableUnderAttackMode(open = false) {
    await client.zones.settings.edit("security_level", {
        zone_id,
        value: open ? "under_attack" : "high"
    });
}

//enableUnderAttackMode(true);

async function createDNSRecord(type, name, content, proxied = false) {
    const response = await client.dns.records.create({
        zone_id,
        type,
        name,
        content,
        proxied
    });
    console.log("DNS kaydı başarıyla oluşturuldu:", response);
    return response
}

//createDNSRecord("A", "backend9824", "31.142.195.151", true);


async function deleteDnsRecord(recordId) {
    await client.dns.records.delete(recordId, {
        zone_id
    });
}

//deleteDnsRecord("a0e7941b278ce84c714db03eccdc0cc8");

async function getFirewallRules() {
    const response = await client.firewall.rules.list({
        zone_id: process.env.CLOUDFLARE_ZONE_ID
    });
    console.log("Firewall kuralları:", response.body.result);
    return response;
}

getFirewallRules()