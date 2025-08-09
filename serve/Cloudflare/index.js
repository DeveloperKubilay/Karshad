const path = require('path');
// .env dosyasını repo kökünden yükle (..\..\.env)
require('dotenv').config({ path: path.resolve(__dirname,  '..', '.env') });

const Cloudflare = require("cloudflare");
const zone_id = process.env.CLOUDFLARE_ZONE_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const client = new Cloudflare({ apiToken });


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

async function editFirewallRules(names) {
    // Migrate to Rulesets API: edit rules in the http_request_firewall_custom entrypoint ruleset
    const phase = 'http_request_firewall_custom';
    const targetExpression = "(ip.src ne 31.142.195.32) and (http.request.uri.path contains \"backend9824\")";

    // Fetch entrypoint ruleset for the given phase
    let entrypoint;
    try {
        entrypoint = await client.rulesets.phases.get(phase, { zone_id });
    } catch (err) {
        console.error('Entrypoint ruleset alınamadı (Rulesets API). Zone veya yetkiyi kontrol edin.', err?.message || err);
        return;
    }
    const rulesetId = entrypoint.id;

    let matched = 0;
    let updated = 0;
    for (const rule of entrypoint.rules) {
        console.log(rule)
        const matchesById = names.includes(rule.id);
        const matchesByRef = rule.ref ? names.includes(rule.ref) : false;
        if (!matchesById && !matchesByRef) continue;

        matched++;

        try {
            // Rulesets API kural güncellemede 'action' dahil zorunlu alanlar bekler.
            // Mevcut kuralın aksiyonunu koruyarak sadece expression'ı güncelliyoruz.
            const payload = {
                zone_id,
                action: rule.action, // örn: 'block'
                expression: targetExpression,
                enabled: rule.enabled,
                description: rule.description,
            };
            // Varsa action_parameters'ı da koru
            if (rule.action_parameters) {
                payload.action_parameters = rule.action_parameters;
            }

            const res = await client.rulesets.rules.edit(rulesetId, rule.id, payload);
            console.log(`Rule updated: ruleset=${rulesetId} rule=${rule.id} (ref=${rule.ref || '-'})`);
            updated++;
        } catch (err) {
            console.error('Failed to update rule', { rulesetId, ruleId: rule.id, ref: rule.ref, error: err?.message || err });
        }
    }

    if (matched === 0) {
        console.warn('Hiçbir kural ID/ref eşleşmedi. Güncellemek istediğiniz kuralın id veya ref değerini geçin.');
    } else if (updated === 0) {
        console.warn(`Eşleşen ${matched} kural var fakat güncelleme başarısız oldu. Hata detayları yukarıda.`);
    } else {
        console.log(`Toplam ${matched} eşleşmeden ${updated} kural güncellendi.`);
    }
}

editFirewallRules(["eb28686e6d934a28a5c941c703bf4c34"])