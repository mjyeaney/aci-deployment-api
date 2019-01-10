//
// Provides an abstraction around working with the ACI API.
//

import { ContainerInstanceManagementClient } from "azure-arm-containerinstance";
import { ResourceManagementClient } from "azure-arm-resource";
import * as msrest from "ms-rest-azure";
import uuid = require("uuid");
import { ContainerGroupListResult, ContainerGroup, ImageRegistryCredential } from "azure-arm-containerinstance/lib/models";
import * as lockfile from "proper-lockfile";
import { ILogger, IContainerService, GroupMatchInformation } from "./common-types";
import { IPendingDeploymentCache } from "./pending-deployment-cache";

export class ContainerService implements IContainerService {
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

    private readonly SYNC_ROOT_FILE_PATH: string = "./data/sync.lock";

    private readonly logger: ILogger;
    private readonly pendingCache: IPendingDeploymentCache;
    private aciClient: ContainerInstanceManagementClient | undefined;
    private armClient: ResourceManagementClient.default | undefined;

    constructor(logger: ILogger, pendingCache: IPendingDeploymentCache) {
        this.logger = logger;
        this.pendingCache = pendingCache;
    }

    public async GetDeployments() {
        return new Promise<ContainerGroupListResult>((resolve, reject) => {
            const start = Date.now();
            this.initializeAciClient().then(() => {

                // List container instances / groups
                this.aciClient!.containerGroups.list().then((containerGroups) => {
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
            this.initializeAciClient().then(() => {

                // List container instances / groups
                this.aciClient!.containerGroups.get(this.RESOURCE_GROUP_NAME, containerGroupName)
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
            this.initializeAciClient()
            .then(() => {
                return this.initializeArmClient();
            })
            .then(() => {
                return this.aciClient!.containerGroups.get(this.RESOURCE_GROUP_NAME, containerGroupName);
            })
            .then((group) => {
                return this.armClient!.resources.deleteById(group.id!, "2018-10-01");
            })
            .then(() => {
                resolve();
            })
            .catch((reason) => {
                reject(reason);
            })
            .finally(() => {
                const duration = Date.now() - start;
                this.logger.Write(`::DeleteDeployment duration: ${duration} ms`);
            })
        });
    }

    public async StopDeployment(containerGroupName: string) {
        return new Promise<void>((resolve, reject) => {
            const start = Date.now();
            this.initializeAciClient()
            .then(() => {
                return this.aciClient!.containerGroups.stop(this.RESOURCE_GROUP_NAME,
                    containerGroupName);
            })
            .then(() => {
                resolve();
            })
            .catch((reason: any) => {
                reject(reason);
            })
            .finally(() => {
                const duration = Date.now() - start;
                this.logger.Write(`::StopDeployment duration: ${duration} ms`);
            })
        })
    }

    public async CreateNewDeployment(numCpu: number, memoryInGB: number) {
        return new Promise<ContainerGroup>((resolve, reject) => {
            const start = Date.now();
            this.initializeAciClient()
            .then(() => {
                return this.GetMatchingGroupInfo(numCpu, memoryInGB);
            })
            .then(async (matchInfo: GroupMatchInformation) => {
                if (!matchInfo.Group) {
                    this.logger.Write("Starting new container group deployment (no match found)...");
                    matchInfo.Group = await this.aciClient!.containerGroups.createOrUpdate(this.RESOURCE_GROUP_NAME, 
                        matchInfo.Name, 
                        this.getContainerGroupDescription(memoryInGB, numCpu, matchInfo.Name));
                } else {
                    this.logger.Write("Starting existing container group (match found)...");
                    await this.aciClient!.containerGroups.start(this.RESOURCE_GROUP_NAME, matchInfo.Name);
                }
                return matchInfo.Group;
            })
            .then(async (result: ContainerGroup) => {
                await this.pendingCache.RemoveDeploymentName(result.name!);
                resolve(result);
            })
            .catch((err: any) => {
                this.logger.Write("*****Error in ::CreateNewDeployment*****");
                this.logger.Write(JSON.stringify(err));
                reject(err);
            })
            .finally(() => {
                const end: number = Date.now();
                const duration = end - start;
                this.logger.Write(`::CreateNewDeployment duration ${duration} ms`);
            });
        });
    }

    public async GetMatchingGroupInfo(numCpu: number, memoryInGB: number): Promise<GroupMatchInformation> {
        // list all existing groups, and lookup the status of each (..this is O(n^2)..may have runtime issues)
        // May be a better strategy to introduce partitioning scheme to limit traversal
        const matchInfo = new GroupMatchInformation();
        const groups = await this.GetDeployments();
        const groupStatus = await Promise.all(groups.map(async (group: ContainerGroup) => {
            return this.GetDeployment(group.name!);
        }));

        ////////////////////////////////////////////////////////////////////////////////////
        //
        // BEGIN CRITICAL SECTION
        //
        // Note this finds the first, unused matching deployment...and so will every other request on this 
        // and other nodes. This leads to a race, with multiple, overlapping requests trying to re-use the same 
        // deployment (which works but causes silent failures as only a single node is started).
        //
        // To combat this, we're applying a critical section around this code and tracking which instances 
        // are "claimed" but not yet started.
        //
        this.logger.Write(`Starting critical section...`);
        await lockfile.lock(this.SYNC_ROOT_FILE_PATH, { retries: 5});

        try {
            const pendingDeployments = await this.pendingCache.GetCurrentDeploymentNames();
            const matched = groupStatus.some((details) => {
                if ((details.instanceView!.state === "Stopped") &&
                    (details.containers[0].image === this.CONTAINER_IMAGE_NAME) &&
                    (details.containers[0].resources.requests.cpu === numCpu) &&
                    (details.containers[0].resources.requests.memoryInGB === memoryInGB) &&
                    (pendingDeployments.indexOf(details.name!) === -1)) {
                    matchInfo.Name = details.name!;
                    matchInfo.Group = details;
                    return true;
                }
                return false;
            });

            // No matches found - create a new deployment name
            if (!matched) {
                const uniq = uuid().substr(-12);
                matchInfo.Name = `aci-inst-${uniq}`;
            }

            // Tack the matched instances as "off limits", so the next caller 
            // that enters this critical section won't also select the same match
            // (as it's potentially not yet started).
            await this.pendingCache.AddPendingDeploymentName(matchInfo.Name);
        }
        catch (err){
            this.logger.Write(`ERROR: Error during critical section: ${err}`);
        }
        finally {
            this.logger.Write(`Critical section finished - releasing mutex...`);
            lockfile.unlockSync(this.SYNC_ROOT_FILE_PATH);
        }
        
        //
        // END CRITICAL SECTION
        //
        ////////////////////////////////////////////////////////////////////////////////////

        return matchInfo;
    }

    public async GetFullConatinerDetails(): Promise<ContainerGroup[]> {
        // list all existing groups
        this.logger.Write("Listing group deployments...");
        const groups = await this.GetDeployments();
        const groupStatus = await Promise.all(groups.map(async (group: ContainerGroup) => {
            return this.GetDeployment(group.name!);
        }));
        return groupStatus;
    }

    private getContainerGroupDescription(memoryInGB: number, numCpu: number, groupName: string) {
        return {
            containers: [{
                name: "default-container",
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
                dnsNameLabel: groupName
            },
            restartPolicy: "Never"
        };
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

    private async initializeAciClient() {
        return new Promise<void>((resolve, reject) => {
            if (!this.aciClient) {
                this.logger.Write("Begining SPN login...");

                msrest.loginWithServicePrincipalSecret(this.CLIENT_ID,
                    this.CLIENT_SECRET,
                    this.TENANT_ID
                )
                .then((creds) => {
                    this.logger.Write("SPN login complete. AciClient ready to use.");
                    this.aciClient = new ContainerInstanceManagementClient(creds, this.SUBSCRIPTION_ID, undefined, {
                        longRunningOperationRetryTimeout: 5
                    });
                    resolve();
                });
            } else {
                this.logger.Write("AciClient already initialized...");
                resolve();
            }
        });
    }

    private async initializeArmClient() {
        return new Promise<void>((resolve, reject) => {
            if (!this.armClient) {
                this.logger.Write("Begining SPN login...");

                msrest.loginWithServicePrincipalSecret(this.CLIENT_ID,
                    this.CLIENT_SECRET,
                    this.TENANT_ID
                )
                .then((creds) => {
                    this.logger.Write("SPN login complete. ArmClient ready to use.");
                    this.armClient = new ResourceManagementClient.default(creds, this.SUBSCRIPTION_ID, undefined, {
                        longRunningOperationRetryTimeout: 5
                    });
                    resolve();
                });
            } else {
                this.logger.Write("ArmClient already initialized...");
                resolve();
            }
        });
    }
}