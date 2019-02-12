//
// Provides an abstraction around working with the ACI API.
//

import { ContainerInstanceManagementClient } from "azure-arm-containerinstance";
import { ResourceManagementClient } from "azure-arm-resource";
import * as msrest from "ms-rest-azure";
import { ContainerGroupListResult, ContainerGroup, ImageRegistryCredential } from "azure-arm-containerinstance/lib/models";
import * as lockfile from "proper-lockfile";
import { ILogger, IContainerService, GroupMatchInformation, IGroupStrategy, IPendingOperationCache, ContainerGroupStatus, ConfigurationDetails } from "./common-types";
import { IConfigService } from "./config-service";

export class ContainerService implements IContainerService {
    private readonly SYNC_ROOT_FILE_PATH: string = "./data/aci.lock";

    private readonly logger: ILogger;
    private readonly settings: ConfigurationDetails;
    private readonly pendingCache: IPendingOperationCache;
    private readonly groupStrategy: IGroupStrategy;
    private aciClient: ContainerInstanceManagementClient | undefined;
    private armClient: ResourceManagementClient.default | undefined;

    constructor(logger: ILogger, config: IConfigService, groupStrategy: IGroupStrategy, pendingCache: IPendingOperationCache) {
        this.logger = logger;
        this.settings = config.GetConfiguration();
        this.groupStrategy = groupStrategy;
        this.pendingCache = pendingCache;
    }

    public async GetDeployments() {
        return new Promise<ContainerGroupListResult>((resolve, reject) => {
            const start = Date.now();
            this.initializeAciClient()
                .then(() => {
                    return this.aciClient!.containerGroups.list();
                })
                .then((containerGroups) => {
                    resolve(containerGroups);
                })
                .catch((err) => {
                    this.logger.Write("*****Error in ::GetDeployments*****");
                    this.logger.Write(JSON.stringify(err));
                    reject(err);
                })
                .finally(() => {
                    const duration = Date.now() - start;
                    this.logger.Write(`::GetDeployments duration: ${duration} ms`);
                });
        });
    }

    public async GetDeployment(containerGroupName: string) {
        return new Promise<ContainerGroup>((resolve, reject) => {
            const start = Date.now();
            this.initializeAciClient()
                .then(() => {
                    return this.aciClient!.containerGroups.get(this.settings.ResourceGroup, containerGroupName);
                })
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
    }

    public async DeleteDeployment(containerGroupName: string) {
        return new Promise<void>((resolve, reject) => {
            const start = Date.now();
            this.initializeAciClient()
                .then(() => {
                    return this.initializeArmClient();
                })
                .then(() => {
                    return this.aciClient!.containerGroups.get(this.settings.ResourceGroup, containerGroupName);
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
                    return this.aciClient!.containerGroups.stop(this.settings.ResourceGroup,
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

    public async CreateNewDeployment(numCpu: number, memoryInGB: number, tag: string | undefined) {
        return new Promise<ContainerGroup>((resolve, reject) => {
            const start = Date.now();
            this.initializeAciClient()
                .then(() => {
                    return this.GetMatchingGroupInfo(numCpu, memoryInGB, tag);
                })
                .then(async (matchInfo: GroupMatchInformation) => {
                    return this.groupStrategy.InvokeCreationDelegate(
                        matchInfo, 
                        () => {
                            return this.aciClient!.containerGroups.beginCreateOrUpdate(this.settings.ResourceGroup,
                                matchInfo.Name,
                                this.getContainerGroupDescription(memoryInGB, numCpu, matchInfo.Name, tag));
                        }, 
                        () => {
                            return this.aciClient!.containerGroups.start(this.settings.ResourceGroup, matchInfo.Name);
                        },
                        () => {
                            return this.aciClient!.containerGroups.restart(this.settings.ResourceGroup, matchInfo.Name);
                        }
                    );
                })
                .then(async (result: ContainerGroup) => {
                    await this.pendingCache.RemovePendingOperation(result.name!);
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

    public async GetMatchingGroupInfo(numCpu: number, memoryInGB: number, tag: string | undefined): Promise<GroupMatchInformation> {
        ////////////////////////////////////////////////////////////////////////////////////
        //
        // BEGIN CRITICAL SECTION
        //
        // Note this finds the first, unused matching deployment...and so will every other request on this 
        // (and other() nodes. This leads to a race, with multiple, overlapping requests trying to re-use the same 
        // deployment (which works but causes silent failures as only a single node is started).
        //
        // To combat this, we're applying a critical section around this code and tracking which instances 
        // are "claimed" but not yet started.
        //
        const matchInfo = new GroupMatchInformation();
        await lockfile.lock(this.SYNC_ROOT_FILE_PATH, { retries: 5 });
        this.logger.Write(`Entered critical section...`);

        try {
            // List all existing groups, and lookup the status of each (..this is O(n^2)..may have runtime issues)
            // May be a better strategy to introduce partitioning scheme to limit traversal
            const pendingOps = await this.pendingCache.GetPendingOperations();
            const groups = await this.GetDeployments();

            const groupStatus = await Promise.all(groups.map(async (group: ContainerGroup) => {
                return this.GetDeployment(group.name!);
            }));

            // Note that image may or may not specify a tag
            let imageName = this.groupStrategy.GetImageName(this.settings.ContainerImage, tag);

            const matched = groupStatus.some((details) => {
                const isMatch = this.groupStrategy.IsMatch(details,
                    numCpu,
                    memoryInGB,
                    imageName,
                    pendingOps);

                if (isMatch) {
                    // Capture remaining details
                    matchInfo.WasTerminated = this.groupStrategy.IsTerminated(details);
                    matchInfo.Name = details.name!;
                    matchInfo.Group = details;
                }
                return isMatch;
            });

            // No matches found - create a new deployment name
            if (!matched) {
                matchInfo.Name = this.groupStrategy.GetNewDeploymentName();
            }

            // Tack the matched instances as "off limits", so the next caller 
            // that enters this critical section won't also select the same match
            // (as it's potentially not yet started).
            await this.pendingCache.AddPendingOperation(matchInfo.Name);
        }
        catch (err) {
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

    private getContainerGroupDescription(memoryInGB: number, numCpu: number, groupName: string, tag: string | undefined) {
        return {
            containers: [{
                name: "default-container",
                image: this.groupStrategy.GetImageName(this.settings.ContainerImage, tag),
                ports: [{
                    port: this.settings.ContainerPort
                }],
                resources: {
                    requests: {
                        memoryInGB: memoryInGB,
                        cpu: numCpu
                    }
                }
            }],
            imageRegistryCredentials: this.getImageRegistryCredentials(),
            location: this.settings.Region,
            osType: this.settings.ContainerOs,
            ipAddress: {
                ports: [{ port: this.settings.ContainerPort }],
                type: "public",
                dnsNameLabel: groupName
            },
            restartPolicy: "Never"
        };
    }

    private getImageRegistryCredentials(): ImageRegistryCredential[] | undefined {
        if ((this.settings.ContainerRegistryHost === "") || (this.settings.ContainerRegistryUsername === "")) {
            return undefined;
        }

        const credentials = [];
        credentials.push({
            server: this.settings.ContainerRegistryHost,
            username: this.settings.ContainerRegistryUsername,
            password: this.settings.ContainerRegistryPassword
        });
        return credentials;
    }

    private async initializeAciClient() {
        return new Promise<void>((resolve, reject) => {
            if (!this.aciClient) {
                this.logger.Write("Begining SPN login...");

                msrest.loginWithServicePrincipalSecret(this.settings.ClientId,
                    this.settings.ClientSecret,
                    this.settings.TenantId
                )
                .then((creds) => {
                    this.logger.Write("SPN login complete. AciClient ready to use.");
                    this.aciClient = new ContainerInstanceManagementClient(creds, this.settings.SubscriptionId, undefined, {
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

                msrest.loginWithServicePrincipalSecret(this.settings.ClientId,
                    this.settings.ClientSecret,
                    this.settings.TenantId
                )
                .then((creds) => {
                    this.logger.Write("SPN login complete. ArmClient ready to use.");
                    this.armClient = new ResourceManagementClient.default(creds, this.settings.SubscriptionId, undefined, {
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