//
// Provides an abstraction around working with the ACI API.
//

import { ContainerInstanceManagementClient } from "azure-arm-containerinstance";
import * as msrest from "ms-rest-azure";
import { ILogger, ConsoleLogger } from "./logging";
import uuid = require("uuid");

export interface GetDeploymentResponse
{
    DeploymentId: string;
    Fqdn: string;
    IpAddress: string;
    Port: number;
}

export interface GetActiveDeploymentsResponse
{
    ActiveDeployments: GetDeploymentResponse[];
}

export interface CreateContainerGroupResponse
{
    DeploymentId: string;
}

export interface IContainerServices
{
    GetActiveDeployments(): Promise<GetActiveDeploymentsResponse[]>;
    GetDeployment(deploymentId: string): Promise<GetDeploymentResponse>;
    CreateNewDeployment(): Promise<CreateContainerGroupResponse>;
}

export class ContainerServices implements IContainerServices
{
    private readonly SUBSCRIPTION_ID = process.env.SUBSCRIPTION_ID || "";
    private readonly REGION = process.env.REGION || "";
    private readonly RESOURCE_GROUP_NAME = process.env.RESOURCE_GROUP_NAME || "";
    private readonly CONTAINER_IMAGE_NAME = process.env.TMODS_COMPUTE_IMAGE || "";
    private readonly CONTAINER_GROUP_NAME = "tmods-1209201805";
    private readonly CONTAINER_INSTANCE_NAME = "tmods-compute";

    private readonly logger: ILogger = new ConsoleLogger();
    private creds: msrest.DeviceTokenCredentials = {} as msrest.DeviceTokenCredentials;

    constructor() 
    {
        this.logger.LogMessage("Begining interactive login...");

        console.log("SUBSCRIPTION ID: " + this.SUBSCRIPTION_ID);

        // Just temp...need to replace with SP login
        msrest.interactiveLogin((_, creds) => {
            this.logger.LogMessage("Login completed. Creating ACI client...");
            this.creds = creds;
        });
    }

    public async GetActiveDeployments()
    {
        return new Promise<GetActiveDeploymentsResponse[]>((resolve, reject) => {
            const start = Date.now();
        
            let client = new ContainerInstanceManagementClient(this.creds, this.SUBSCRIPTION_ID);
            this.logger.LogMessage("ACI client created...");

            // List container instances / groups
            client.containerGroups.list().then((containerGroups) => {
                console.dir(containerGroups, {depth: null, colors: true});            
                resolve([]);
            }).catch((err) => {
                console.dir(err, {depth: null, colors: true});
                reject();
            });
        });
    }

    public async GetDeployment(deploymentId: string)
    {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    public async CreateNewDeployment()
    {
        let status = {
            OperationId: uuid(),
            Status: "Pending",
            IsReady: false,
            Fqdn: "",
            IpAddress: "",
            Port: 0
        };
        
        const start = Date.now();
    
        let client = new ContainerInstanceManagementClient(this.creds, this.SUBSCRIPTION_ID);
        this.logger.LogMessage("ACI client created...");
    
        // Create a container group
        this.logger.LogMessage("Updating container group deployment...");
        client.containerGroups.createOrUpdate(this.RESOURCE_GROUP_NAME, this.CONTAINER_GROUP_NAME, {
            containers: [{
                name: this.CONTAINER_INSTANCE_NAME,
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
                dnsNameLabel: this.CONTAINER_GROUP_NAME
            }
        }).then((group) => {
            this.logger.LogMessage("Container group created!!!");
            console.dir(group);
        }).catch((err) => {
            this.logger.LogMessage('ERROR!!!');
            console.dir(err);
        }).finally(() => {
            const end: number = Date.now();
            const duration = end - start;
            this.logger.LogMessage(`Deployment time took ${duration} ms`);
        });

        return new Promise<CreateContainerGroupResponse>(resolve => {
            resolve(status);
        });
    }
}