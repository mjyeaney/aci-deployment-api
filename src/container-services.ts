//
// Provides an abstraction around working with the ACI API.
//

import { ContainerInstanceManagementClient } from "azure-arm-containerinstance";
import * as msrest from "ms-rest-azure";
import { ILogger } from "./logging";
import uuid = require("uuid");
import { ContainerGroupListResult, ContainerGroup, ImageRegistryCredential } from "azure-arm-containerinstance/lib/models";

export interface IContainerServices {
    InitializationComplete: boolean;
    GetDeployments(): Promise<ContainerGroupListResult>;
    GetDeployment(containerGroupName: string): Promise<ContainerGroup>;
    CreateNewDeployment(numCpu: number, memoryInGB: number): Promise<ContainerGroup>;
    DeleteDeployment(containerGroupName: string): Promise<void>;
    GetMatchingGroupInfo(numCpu: number, memoryInGB: number): Promise<GroupMatchInformation>;
    GetFullConatinerDetails(): Promise<ContainerGroup[]>;
}

class GroupMatchInformation {
    GroupName: string = "";
    Group: ContainerGroup | undefined = undefined;
}

export class ContainerServices implements IContainerServices {
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

    private readonly logger: ILogger;
    private creds!: msrest.DeviceTokenCredentials;
    private client!: ContainerInstanceManagementClient;

    public InitializationComplete: boolean = false;

    constructor(logger: ILogger) {
        this.logger = logger;
    }

    public async GetDeployments() {
        return new Promise<ContainerGroupListResult>((resolve, reject) => {
            const start = Date.now();
            this.initializeClient().then(() => {

                // List container instances / groups
                this.client.containerGroups.list().then((containerGroups) => {
                    resolve(containerGroups);
                }).catch((err) => {
                    this.logger.Write("*****Error in ::GetDeployments*****");
                    this.logger.Write(JSON.stringify(err));
                    reject(err);
                }).finally(() => {
                    const duration = Date.now() - start;
                    this.logger.Write(`::GetDeployments duration: ${duration} ms`);
                });

            });
        });
    }

    public async GetDeployment(containerGroupName: string) {
        return new Promise<ContainerGroup>((resolve, reject) => {
            const start = Date.now();
            this.initializeClient().then(() => {

                // List container instances / groups
                this.client.containerGroups.get(this.RESOURCE_GROUP_NAME, containerGroupName)
                .then((containerGroup) => {
                    resolve(containerGroup);
                })
                .catch((err) => {
                    this.logger.Write("*****Error in ::GetDeployment*****");
                    this.logger.Write(JSON.stringify(err));
                    reject(err);
                })
                .finally(() => {
                    const duration = Date.now() - start;
                    this.logger.Write(`::GetDeployment duration: ${duration} ms`);
                });

            });
        });
    }

    public async DeleteDeployment(containerGroupName: string) {
        return new Promise<void>((resolve, reject) => {
            const start = Date.now();
            this.initializeClient().then(() => {
                // TODO: Need ARM client to remove resource
                resolve();
            });
        });
    }

    public async CreateNewDeployment(numCpu: number, memoryInGB: number) {
        const containerName = "default-container";

        return new Promise<ContainerGroup>((resolve, reject) => {
            const start = Date.now();
            this.initializeClient()
                .then(() => {
                    return this.GetMatchingGroupInfo(numCpu, memoryInGB);
                })
                .then((matchInfo: GroupMatchInformation) => {
                    if (!matchInfo.Group) {
                        // Create a container group - there was no match
                        this.logger.Write("Starting new container group deployment (no match found)...");
                        this.client.containerGroups.createOrUpdate(this.RESOURCE_GROUP_NAME, matchInfo.GroupName, {
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
                                ports: [{ port: this.CONTAINER_PORT }],
                                type: "public",
                                dnsNameLabel: matchInfo.GroupName
                            },
                            restartPolicy: "Never"
                        })
                        .then((group) => {
                            resolve(group);
                        })
                        .catch((err) => {
                            this.logger.Write("*****Error in ::CreateNewDeployment*****");
                            this.logger.Write(JSON.stringify(err));
                            reject(err);
                        })
                        .finally(() => {
                            const end: number = Date.now();
                            const duration = end - start;
                            this.logger.Write(`::CreateNewDeployment duration ${duration} ms`);
                        });
                    } else {
                        this.logger.Write("Starting existing container group (match found)...");
                        this.client.containerGroups.start(this.RESOURCE_GROUP_NAME, matchInfo.GroupName)
                            .then(() => {
                                resolve(matchInfo.Group);
                            })
                            .catch((err) => {
                                this.logger.Write("*****Error in ::CreateNewDeployment*****");
                                this.logger.Write(JSON.stringify(err));
                                reject(err);
                            })
                            .finally(() => {
                                const end: number = Date.now();
                                const duration = end - start;
                                this.logger.Write(`::CreateNewDeployment duration ${duration} ms`);
                            });
                    }
                });
        });
    }

    public async GetMatchingGroupInfo(numCpu: number, memoryInGB: number): Promise<GroupMatchInformation> {
        // list all existing groups, and lookup the status of each (..this is O(n^2)..may have runtime issues)
        // May be a better strategy to introduce partitioning scheme to limit traversal
        const matchInfo = new GroupMatchInformation();
        const groups = await this.GetDeployments();

        const groupStatus = await Promise.all(groups.map(async (group: ContainerGroup) => {
            return await this.GetDeployment(group.name!);
        }));

        const matched = groupStatus.some((details) => {
            if ((details.instanceView!.state === "Stopped") &&
                (details.containers[0].image === this.CONTAINER_IMAGE_NAME) &&
                (details.containers[0].resources.requests.cpu === numCpu) &&
                (details.containers[0].resources.requests.memoryInGB === memoryInGB)) {
                matchInfo.GroupName = details.name!;
                matchInfo.Group = details;
                return true;
            }
            return false;
        });

        if (!matched) {
            const uniq = uuid().substr(-12);
            matchInfo.GroupName = `aci-inst-${uniq}`;
        }

        return matchInfo;
    }

    public async GetFullConatinerDetails(): Promise<ContainerGroup[]> {
        // list all existing groups
        let groupName: string = "";
        this.logger.Write("Listing group deployments...");
        let groups = await this.GetDeployments();
        let groupStatus = await Promise.all(groups.map(async (group: ContainerGroup) => {
            return await this.GetDeployment(group.name!);
        }));
        return groupStatus;
    }

    private getImageRegistryCredentials(): ImageRegistryCredential[] | undefined {
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

    private async initializeClient() {
        return new Promise<void>((resolve, reject) => {
            if (!this.InitializationComplete) {
                this.logger.Write("Begining SPN login...");

                msrest.loginWithServicePrincipalSecret(this.CLIENT_ID,
                    this.CLIENT_SECRET,
                    this.TENANT_ID
                ).then((creds) => {
                    this.logger.Write("SPN login complete. Instance ready to use.");
                    this.creds = creds;
                    this.client = new ContainerInstanceManagementClient(this.creds, this.SUBSCRIPTION_ID, undefined, {
                        longRunningOperationRetryTimeout: 5
                    });
                    this.InitializationComplete = true;
                    resolve();
                });
            } else {
                this.logger.Write("Client already initialized...");
                resolve();
            }
        });
    }
}