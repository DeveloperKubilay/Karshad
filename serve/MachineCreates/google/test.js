const { InstancesClient } = require('@google-cloud/compute');
const projectId = "dotted-lens-470017-f5";
const zone = "us-central1-b";
const google = new InstancesClient({ keyFilename: "./machine/env.json" });

async function getInstanceStatus(instanceName) {

    const [instance] = await google.get({
        project: projectId,
        zone: zone,
        instance: instanceName,
    });
    return instance.status;
}

async function setInstanceStatus(instanceName, start) {

    if (start) {
        await google.start({
            project: projectId,
            zone: zone,
            instance: instanceName,
        });
        console.log(`VM ${instanceName} başlatıldı`);
    } else {
        await google.stop({
            project: projectId,
            zone: zone,
            instance: instanceName,
        });
        console.log(`VM ${instanceName} durduruldu`);
    }
}


async function main() {
    const instanceName = "instance-1757097947067";

    let status = await getInstanceStatus(instanceName);
    console.log(`Instance ${instanceName} durumu: ${status}`);

    await setInstanceStatus(instanceName, false);

    status = await getInstanceStatus(instanceName);
    console.log(`Instance ${instanceName} durumu: ${status}`);
}

main()