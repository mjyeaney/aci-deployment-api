//
// Provides an abstraction around working with the ACI API.
//

import { ContainerInstanceManagementClient } from "azure-arm-containerinstance";
import * as msrest from "ms-rest-azure";
import { ILogger, ConsoleLogger } from "./logging";
import uuid = require("uuid");
import { ContainerGroupListResult, ContainerGroup } from "azure-arm-containerinstance/lib/models";
import { resolve } from "path";

export interface IContainerServices
{
    GetActiveDeployments(): Promise<ContainerGroupListResult>;
    GetDeployment(containerGroupName: string): Promise<{}>;
    CreateNewDeployment(): Promise<ContainerGroup>;
}

export class ContainerServices implements IContainerServices
{
    private readonly SUBSCRIPTION_ID = process.env.SUBSCRIPTION_ID || "";
    private readonly REGION = process.env.REGION || "";
    private readonly RESOURCE_GROUP_NAME = process.env.RESOURCE_GROUP_NAME || "";
    private readonly CONTAINER_IMAGE_NAME = process.env.CONTAINER_IMAGE || "";

    private readonly logger: ILogger = new ConsoleLogger();
    private creds: msrest.DeviceTokenCredentials = {} as msrest.DeviceTokenCredentials;

    constructor() 
    {
        this.logger.LogMessage("Begining interactive login...");

        // Just temp...need to replace with SP login
        // msrest.interactiveLogin((_, creds) => {
        //     this.logger.LogMessage("Login completed. Creating ACI client...");
        //     this.creds = creds;
        // });
    }

    public async GetActiveDeployments()
    {
        return new Promise<ContainerGroupListResult>((resolve, reject) => {
            const start = Date.now();
            let client = new ContainerInstanceManagementClient(this.creds, this.SUBSCRIPTION_ID);

            // List container instances / groups
            client.containerGroups.list().then((containerGroups) => {
                resolve(containerGroups);
            }).catch((err) => {
                this.logger.LogMessage(`Error!!!!`);
                this.logger.LogMessage(JSON.stringify(err));
                reject(err);
            }).finally(() => {
                const duration = Date.now() - start;
                this.logger.LogMessage(`GetActiveDeployments - ${duration} ms.`);
            });
        });
    }

    public async GetDeployment(containerGroupName: string)
    {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            let client = new ContainerInstanceManagementClient(this.creds, this.SUBSCRIPTION_ID);

            // List container instances / groups
            client.containerGroups.get(this.RESOURCE_GROUP_NAME, containerGroupName).then((containerGroup) => {
                resolve(containerGroup);
            }).catch((err) => {
                this.logger.LogMessage(`Error!!!!`);
                this.logger.LogMessage(JSON.stringify(err));
                reject(err);
            }).finally(() => {
                const duration = Date.now() - start;
                this.logger.LogMessage(`GetActiveDeployments - ${duration} ms.`);
            });
        });
    }

    public async CreateNewDeployment()
    {
        const uniq = uuid().substr(-12);
        const containerGroupName = `aci-inst-${uniq}`;
        const containerName = `aci-cont-${uniq}`;

        return new Promise<ContainerGroup>((resolve, reject) => {
            const start = Date.now();
            let client = new ContainerInstanceManagementClient(this.creds, this.SUBSCRIPTION_ID);
        
            // Create a container group
            this.logger.LogMessage("Starting container group deployment...");
            client.containerGroups.createOrUpdate(this.RESOURCE_GROUP_NAME, containerGroupName, {
                containers: [{
                    name: containerName,
                    image: this.CONTAINER_IMAGE_NAME,
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
                location: this.REGION,
                osType: "linux",
                ipAddress: {
                    ports: [{port: 80}],
                    type: "public",
                    dnsNameLabel: containerGroupName
                }
            }).then((group) => {
                resolve(group);
            }).catch((err) => {
                this.logger.LogMessage('ERROR!!!');
                this.logger.LogMessage(JSON.stringify(err));
                reject(err);
            }).finally(() => {
                const end: number = Date.now();
                const duration = end - start;
                this.logger.LogMessage(`Deployment time took ${duration} ms`);
            });
        });
    }
}