//
// Provides an abstraction around working with the ACI API.
//

import { ContainerInstanceManagementClient } from "azure-arm-containerinstance";
import * as msrest from "ms-rest-azure";
import { ILogger, ConsoleLogger } from "./logging";
import uuid = require("uuid");
import { ContainerGroupListResult, ContainerGroup, ImageRegistryCredential } from "azure-arm-containerinstance/lib/models";

export interface IContainerServices
{
    GetDeployments(): Promise<ContainerGroupListResult>;
    GetDeployment(containerGroupName: string): Promise<ContainerGroup>;
    CreateNewDeployment(numCpu: number, memoryInGB: number): Promise<ContainerGroup>;
    GetMatchingGroupName(numCpu: number, memoryInGB: number): Promise<string>;
}

export class ContainerServices implements IContainerServices
{
    private readonly TENANT_ID = process.env.TENANT_ID || "";
    private readonly CLIENT_ID = process.env.CLIENT_ID || "";
    private readonly CLIENT_SECRET = process.env.CLIENT_SECRET || "";
    private readonly SUBSCRIPTION_ID = process.env.SUBSCRIPTION_ID || "";
    private readonly REGION = process.env.REGION || "";
    private readonly RESOURCE_GROUP_NAME = process.env.RESOURCE_GROUP_NAME || "";
    private readonly CONTAINER_IMAGE_NAME = process.env.CONTAINER_IMAGE || "";
    private readonly CONTAINER_PORT = parseInt(process.env.CONTAINER_PORT || "");
    private readonly CONTAINER_OS_TYPE = process.env.CONTAINER_OS_TYPE || "";
    private readonly CONTAINER_REGISTRY_HOST = process.env.CONTAINER_REGISTRY_HOST || "";
    private readonly CONTAINER_REGISTRY_USERNAME = process.env.CONTAINER_REGISTRY_USERNAME || "";
    private readonly CONTAINER_REGISTRY_PASSWORD = process.env.CONTAINER_REGISTRY_PASSWORD || "";

    private readonly logger: ILogger = new ConsoleLogger();
    private creds!: msrest.DeviceTokenCredentials;
    private client!: ContainerInstanceManagementClient;

    constructor() 
    {
        this.logger.LogMessage("Begining SPN login...");
        msrest.loginWithServicePrincipalSecret(this.CLIENT_ID, 
            this.CLIENT_SECRET, 
            this.TENANT_ID
        ).then((creds) => {
            this.logger.LogMessage("SPN login complete. Instance ready to use.");
            this.creds = creds;
            this.client = new ContainerInstanceManagementClient(this.creds, this.SUBSCRIPTION_ID, undefined, {
                longRunningOperationRetryTimeout: 5
            });
        });
    }

    public async GetDeployments()
    {
        return new Promise<ContainerGroupListResult>((resolve, reject) => {
            const start = Date.now();

            // List container instances / groups
            this.client.containerGroups.list().then((containerGroups) => {
                resolve(containerGroups);
            }).catch((err) => {
                this.logger.LogMessage("*****Error in ::GetDeployments*****");
                this.logger.LogMessage(JSON.stringify(err));
                reject(err);
            }).finally(() => {
                const duration = Date.now() - start;
                this.logger.LogMessage(`::GetDeployments duration: ${duration} ms`);
            });
        });
    }

    public async GetDeployment(containerGroupName: string)
    {
        return new Promise<ContainerGroup>((resolve, reject) => {
            const start = Date.now();
            
            // List container instances / groups
            this.client.containerGroups.get(this.RESOURCE_GROUP_NAME, containerGroupName).then((containerGroup) => {
                resolve(containerGroup);
            }).catch((err) => {
                this.logger.LogMessage("*****Error in ::GetDeployment*****");
                this.logger.LogMessage(JSON.stringify(err));
                reject(err);
            }).finally(() => {
                const duration = Date.now() - start;
                this.logger.LogMessage(`::GetDeployment duration: ${duration} ms`);
            });
        });
    }

    public async CreateNewDeployment(numCpu: number, memoryInGB: number)
    {
        const containerGroupName = await this.GetMatchingGroupName(numCpu, memoryInGB);
        const containerName = "default-container";

        return new Promise<ContainerGroup>((resolve, reject) => {
            const start = Date.now();
        
            // Create a container group
            this.logger.LogMessage("Starting container group deployment...");
            this.client.containerGroups.createOrUpdate(this.RESOURCE_GROUP_NAME, containerGroupName, {
                containers: [{
                    name: containerName,
                    image: this.CONTAINER_IMAGE_NAME,
                    ports: [{
                        port: this.CONTAINER_PORT
                    }],
                    resources: {
                        requests: {
                            memoryInGB: memoryInGB,
                            cpu: numCpu
                        }
                    }
                }],
                imageRegistryCredentials: this.getImageRegistryCredentials(),
                location: this.REGION,
                osType: this.CONTAINER_OS_TYPE,
                ipAddress: {
                    ports: [{port: this.CONTAINER_PORT}],
                    type: "public",
                    dnsNameLabel: containerGroupName
                },
                restartPolicy: "Never"
            }).then((group) => {
                resolve(group);
            }).catch((err) => {
                this.logger.LogMessage("*****Error in ::CreateNewDeployment*****");
                this.logger.LogMessage(JSON.stringify(err));
                reject(err);
            }).finally(() => {
                const end: number = Date.now();
                const duration = end - start;
                this.logger.LogMessage(`::CreateNewDeployment duration ${duration} ms`);
            });
        });
    }

    public async GetMatchingGroupName(numCpu: number, memoryInGB: number): Promise<string>
    {
        // list all existing groups
        let groupName: string = "";
        this.logger.LogMessage("Listing group deployments...");
        let groups = await this.GetDeployments();
        let groupStatus = await Promise.all(groups.map(async (group: ContainerGroup) => {
            return await this.GetDeployment(group.name!);
        }));
        let matched = groupStatus.some((details) => {
            if ((details.instanceView!.state === "Stopped") && 
                (details.containers[0].resources.requests.cpu === numCpu) &&
                (details.containers[0].resources.requests.memoryInGB === memoryInGB)){
                    groupName = details.name!;
                    return true;
            }
            return false;
        });
        if (!matched){
            const uniq = uuid().substr(-12);
            groupName = `aci-inst-${uniq}`;
        }
        return groupName;
    }

    private getImageRegistryCredentials(): ImageRegistryCredential[] | undefined
    {
        if ((!this.CONTAINER_REGISTRY_HOST) || (!this.CONTAINER_REGISTRY_USERNAME)) {
            return undefined;
        }

        const credentials = [];
        credentials.push({
            server: this.CONTAINER_REGISTRY_HOST,
            username: this.CONTAINER_REGISTRY_USERNAME,
            password: this.CONTAINER_REGISTRY_PASSWORD
        });
        return credentials;
    }
}