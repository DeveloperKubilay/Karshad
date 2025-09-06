const path = require('path');
const Cloudflare = require("cloudflare");
const zone_id = process.env.CLOUDFLARE_ZONE_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const client = new Cloudflare({ apiToken });

async function UnderAttackMode(open = false) {
    await client.zones.settings.edit("security_level", {
        zone_id,
        value: open ? "under_attack" : "high"
    });
}

//UnderAttackMode(true);

async function createDNSRecord(type, name, content) {
    const response = await client.dns.records.create({
        zone_id,
        type,
        name,
        content,
        proxied: true
    });
    return response;
}

//createDNSRecord("A", "backend9824", "31.142.195.151");


async function deleteDnsRecord(recordId) {
    await client.dns.records.delete(recordId, {
        zone_id
    });
}

//deleteDnsRecord("a0e7941b278ce84c714db03eccdc0cc8");

async function editFirewallRules(add, ip) {
    const entrypoint = await client.rulesets.phases.get('http_request_firewall_custom', { zone_id });
    const rulesetId = entrypoint.id;

    const startPrompt = `(${process.env.CLOUDFLARE_URLS.split(",").map(url => `http.host eq "${url}"`).join(" or ")}) and `;

    for (const rule of entrypoint.rules) {
        const matchesById = process.env.CLOUDFLARE_RULES.split(",").includes(rule.description);
        if (!matchesById) continue;

        let ipList = [];
        const ipRegex = /ip\.src ne ([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/g;
        let ipMatch;
        while ((ipMatch = ipRegex.exec(rule.expression)) !== null) {
            ipList.push(ipMatch[1]);
        }


        if (add) {
            if (!ipList.includes(ip)) {
                ipList.push(ip);
            }
        } else {
            ipList = ipList.filter(existingIp => existingIp !== ip);
        }

        const payload = {
            zone_id,
            ...rule,
            expression: startPrompt + `(${ipList.map(ip => `ip.src ne ${ip}`).join(" and ")})`,
        };

        await client.rulesets.rules.edit(rulesetId, rule.id, payload);
    }
}

/*
editFirewallRules(
    false,
    "31.142.195.35"
)*/


async function addVm(ip,name) {
    await editFirewallRules(true,ip)
    name = name.toLowerCase().replace("-","")
    return {
        record: await createDNSRecord("A", name, ip),
        name: name,
    }
}

async function deleteVm(rule) {
    await editFirewallRules(false, rule.ip);
    await deleteDnsRecord(rule.record.id);
}

module.exports = {
    UnderAttackMode,
    addVm,
    deleteVm
};


