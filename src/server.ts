import { ContainerInstanceManagementClient } from "azure-arm-containerinstance";
import * as msrest from "ms-rest-azure";
import { ILogger, ConsoleLogger } from "./logging";
import * as dotenv from "dotenv";

dotenv.config();

const SUBSCRIPTION_ID = process.env.SUBSCRIPTION_ID || "";
const REGION = process.env.REGION || "";
const RESOURCE_GROUP_NAME = process.env.RESOURCE_GROUP_NAME || "";
const CONTAINER_IMAGE_NAME = process.env.TMODS_COMPUTE_IMAGE || "";
const CONTAINER_GROUP_NAME = "tmods-1209201805";
const CONTAINER_INSTANCE_NAME = "tmods-compute";

const logger: ILogger = new ConsoleLogger();

logger.LogMessage("Begining interactive login...");
msrest.interactiveLogin((_, creds) => {
    logger.LogMessage("Login completed. Creating ACI client...");
    const start = Date.now();

    let client = new ContainerInstanceManagementClient(creds, SUBSCRIPTION_ID);
    logger.LogMessage("ACI client created...");

    // List container instances / groups
    // client.containerGroups.list().then((containerGroups) => {
    //     console.dir(containerGroups, {depth: null, colors: true});
    // }).catch((err) => {
    //     console.dir(err, {depth: null, colors: true});
    // });

    // Create a container group
    logger.LogMessage("Updating container group deployment...");
    client.containerGroups.createOrUpdate(RESOURCE_GROUP_NAME, CONTAINER_GROUP_NAME, {
        containers: [{
            name: CONTAINER_INSTANCE_NAME,
            image: CONTAINER_IMAGE_NAME,
            ports: [{
                port: 80
            }],
            resources: {
                requests: {
                    memoryInGB: 1.5,
                    cpu: 1
                }
            }
        }],
        location: REGION,
        osType: "linux",
        ipAddress: {
            ports: [{port: 80}],
            type: "public",
            dnsNameLabel: CONTAINER_GROUP_NAME
        }
    }).then((group) => {
        logger.LogMessage("Container group created!!!");
        console.dir(group);
    }).catch((err) => {
        logger.LogMessage('ERROR!!!');
        console.dir(err);
    }).finally(() => {
        const end: number = Date.now();
        const duration = end - start;
        logger.LogMessage(`Deployment time took ${duration} ms`);
    });
});