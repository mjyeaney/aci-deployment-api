//
// Provides an abstraction around working with the ACI API.
//

import { ContainerInstanceManagementClient } from "azure-arm-containerinstance";
import { ResourceManagementClient } from "azure-arm-resource";
import * as msrest from "ms-rest-azure";
import { ContainerGroupListResult, ContainerGroup, ImageRegistryCredential } from "azure-arm-containerinstance/lib/models";
import { ILogger, IContainerService, ConfigurationDetails } from "./commonTypes";
import { IConfigurationService } from "./configService";
import uuid = require("uuid");

export class ContainerService implements IContainerService {
    private readonly logger: ILogger;
    private readonly settings: ConfigurationDetails;
    private aciClient: ContainerInstanceManagementClient | undefined;
    private armClient: ResourceManagementClient.default | undefined;

    constructor(logger: ILogger, config: IConfigurationService) {
        this.logger = logger;
        this.settings = config.GetConfiguration();
    }

    public async GetDeployments() {
        return new Promise<ContainerGroupListResult>(async (resolve, reject) => {
            const start = Date.now();

            try {
                await this.initializeAciClient();
                let containerGroups = await this.aciClient!.containerGroups.list();
                resolve(containerGroups);
            } catch (err) {
                this.logger.Write("*****Error in ::GetDeployments*****");
                this.logger.Write(JSON.stringify(err));
                reject(err);
            }

            const duration = Date.now() - start;
            this.logger.Write(`::GetDeployments duration: ${duration} ms`);
        });
    }

    public async GetDeployment(containerGroupName: string) {
        return new Promise<ContainerGroup>(async (resolve, reject) => {
            const start = Date.now();
            
            try {
                await this.initializeAciClient();
                let containerGroup = await this.aciClient!.containerGroups.get(this.settings.ResourceGroup, containerGroupName);
                resolve(containerGroup);

            } catch (err) {
                this.logger.Write("*****Error in ::GetDeployment*****");
                this.logger.Write(JSON.stringify(err));
                reject(err);
            }

            const duration = Date.now() - start;
            this.logger.Write(`::GetDeployment duration: ${duration} ms`);
        });
    }

    public async DeleteDeployment(containerGroupName: string) {
        return new Promise<void>(async (resolve, reject) => {
            const start = Date.now();
            
            try {
                await this.initializeAciClient();
                await this.initializeArmClient();
                let group = await this.aciClient!.containerGroups.get(this.settings.ResourceGroup, containerGroupName);
                this.armClient!.resources.deleteById(group.id!, "2018-10-01");
                resolve();
            } catch (err) {
                reject(err);
            }

            const duration = Date.now() - start;
            this.logger.Write(`::DeleteDeployment duration: ${duration} ms`);
        });
    }

    public async StopDeployment(containerGroupName: string) {
        return new Promise<void>(async (resolve, reject) => {
            const start = Date.now();

            try {
                await this.initializeAciClient();
                await this.aciClient!.containerGroups.stop(this.settings.ResourceGroup, containerGroupName);
                resolve();
            } catch (err) {
                reject(err);
            }

            const duration = Date.now() - start;
            this.logger.Write(`::StopDeployment duration: ${duration} ms`);
        })
    }

    public async CreateNewDeployment(numCpu: number, memoryInGB: number, tag: string | undefined) {
        return new Promise<ContainerGroup>(async (resolve, reject) => {
            const start = Date.now();
            
            try {
                await this.initializeAciClient();

                let deploymentName = `aci-inst-${uuid().substr(-12)}`;
                let groupDescription = this.getContainerGroupDescription(memoryInGB, numCpu, deploymentName, tag);
                let containerGroup = await this.aciClient!.containerGroups.beginCreateOrUpdate(this.settings.ResourceGroup,
                    deploymentName, 
                    groupDescription);                    
                
                resolve(containerGroup);
            } catch (err) {
                this.logger.Write("*****Error in ::CreateNewDeployment*****");
                this.logger.Write(JSON.stringify(err));
                reject(err);
            }

            const duration = Date.now() - start;
            this.logger.Write(`::CreateNewDeployment duration ${duration} ms`);
        });
    }

    public async CreateNewDeploymentSync(numCpu: number, memoryInGB: number, tag: string | undefined) {
        return new Promise<ContainerGroup>(async (resolve, reject) => {
            const start = Date.now();
            
            try {
                await this.initializeAciClient();

                let deploymentName = `aci-inst-${uuid().substr(-12)}`;
                let groupDescription = this.getContainerGroupDescription(memoryInGB, numCpu, deploymentName, tag);
                let containerGroup = await this.aciClient!.containerGroups.createOrUpdate(this.settings.ResourceGroup,
                    deploymentName, 
                    groupDescription);                    
                
                resolve(containerGroup);
            } catch (err) {
                this.logger.Write("*****Error in ::CreateNewDeployment*****");
                this.logger.Write(JSON.stringify(err));
                reject(err);
            }

            const duration = Date.now() - start;
            this.logger.Write(`::CreateNewDeployment duration ${duration} ms`);
        });
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

    public UpdateDeploymentTag(deploymentResourceId: string, tagName: string, tagValue: string): Promise<void>{
        return new Promise<void>(async (resolve, reject) => {
            const start = Date.now();
            
            try {
                await this.initializeArmClient();

                let tagsObject: any = {};
                tagsObject[tagName] = tagValue;

                await this.armClient!.resources.updateById(deploymentResourceId, "2018-10-01", {
                    tags: tagsObject
                });

                resolve();
            } catch (err) {
                this.logger.Write("*****Error in ::UpdateDeploymentTag*****");
                this.logger.Write(JSON.stringify(err));
                reject(err);
            }

            const duration = Date.now() - start;
            this.logger.Write(`::UpdateDeploymentTag duration: ${duration} ms`);
        });
    }

    public GetDeploymentsByTag(tagName: string, tagValue: string): Promise<Array<string>>{
        return new Promise<Array<string>>(async (resolve, reject) => {
            const start = Date.now();
            
            try {
                await this.initializeArmClient();

                let results: Array<string> = [];
                let tagFilter = `tagName eq '${tagName}' and tagValue eq '${tagValue}'`;
                let resources = await this.armClient!.resources.listByResourceGroup(this.settings.ResourceGroup, 
                    {
                        filter: tagFilter
                    });

                this.logger.Write(`Found ${resources.length} resources matching tag filter "${tagFilter}"`);

                resources.forEach(res => {
                    results.push(res.id!);
                });

                resolve(results);
            } catch (err) {
                this.logger.Write("*****Error in ::GetDeploymentsByTag*****");
                this.logger.Write(JSON.stringify(err));
                reject(err);
            }

            const duration = Date.now() - start;
            this.logger.Write(`::GetDeploymentsByTag duration: ${duration} ms`);
        });
    }

    private getContainerGroupDescription(memoryInGB: number, numCpu: number, groupName: string, tag: string | undefined) {
        let imageName = this.settings.ContainerImage;
        if (tag) {
            imageName = `${this.settings.ContainerImage}:${tag}`;
        }

        return {
            containers: [{
                name: "default-container",
                image: imageName,
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
                })
                .catch((err: any) => {
                    this.logger.Write("*****Error in ::initializeArmClient*****");
                    this.logger.Write(JSON.stringify(err));
                    reject(err);
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
                })
                .catch((err: any) => {
                    this.logger.Write("*****Error in ::initializeArmClient*****");
                    this.logger.Write(JSON.stringify(err));
                    reject(err);
                });
            } else {
                this.logger.Write("ArmClient already initialized...");
                resolve();
            }
        });
    }
}