import { IContainerService } from "../commonTypes";
import { ContainerGroup, ContainerGroupListResult } from "azure-arm-containerinstance/lib/models";

export class EmptyContainerGroup implements ContainerGroup {
    identity?: any;
    provisioningState?: string;
    containers: any;
    imageRegistryCredentials?: any;
    restartPolicy?: string;
    ipAddress?: any;
    osType: string = "";
    volumes?: any;
    instanceView?: any;
    diagnostics?: any;
    networkProfile?: any;
    dnsConfig?: any;
    id?: string;
    name?: string;
    type?: string;
    location?: string;
    tags?: { [propertyName: string]: string; };
}

export class MockContainerService implements IContainerService {
    private deployments: Array<ContainerGroup> = [];

    GetDeployments(): Promise<ContainerGroupListResult> {
        return new Promise<ContainerGroupListResult>((resolve, reject) => {
            resolve(this.deployments);
        });
    }
    GetDeployment(containerGroupName: string): Promise<ContainerGroup>{
        return new Promise<ContainerGroup>((resolve) => {
            let results: ContainerGroup | undefined = this.deployments.find((c) => {
                return c.name! === containerGroupName;
            });
            resolve(results);
        });
    }
    CreateNewDeployment(numCpu: number, memoryInGB: number, tag: string | undefined): Promise<ContainerGroup>{
        return new Promise<ContainerGroup>((resolve) => {
            let newDeployment = new EmptyContainerGroup();
            newDeployment.id = `${Date.now()}:${(Math.random() * 100).toFixed(3)}`;
            newDeployment.name = newDeployment.id;
            this.deployments.push(newDeployment);
            resolve(newDeployment);
        });
    }
    BeginCreateNewDeployment(numCpu: number, memoryInGB: number, imageTag: string | undefined): Promise<ContainerGroup>{
        return new Promise<ContainerGroup>((resolve) => {
            let newDeployment = new EmptyContainerGroup();
            newDeployment.id = Date.now().toString();
            newDeployment.name = newDeployment.id;
            this.deployments.push(newDeployment);
            resolve(newDeployment);
        });
    }
    StopDeployment(containerGroupName: string): Promise<void>{
        throw new Error("method not implemented");
    }
    DeleteDeployment(containerGroupName: string): Promise<void>{
        return new Promise<void>(resolve => {
            let newDeployments: Array<ContainerGroup> = [];
            this.deployments.forEach((c) => {
                if (c.name !== containerGroupName){
                    newDeployments.push(c);
                }
            });
            this.deployments = newDeployments;
            resolve();
        });
    }
    GetFullConatinerDetails(): Promise<ContainerGroup[]>{
        return new Promise<ContainerGroup[]>(resolve => {
            resolve(this.deployments);
        });
    }
}