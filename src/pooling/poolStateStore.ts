//
// Implements the state storage for the container instance pool
// This allows tracking of members that are in-use / etc.
//

import { IContainerService, ILogger } from "../commonTypes";

export interface IPoolStateStore {
    GetFreeMemberIDs(): Promise<Array<string>>;
    GetInUseMemberIDs(): Promise<Array<string>>;
    UpdateMember(memberId: string, inUse: boolean): Promise<void>;
}

export class PoolStateStore implements IPoolStateStore {
    private containerService: IContainerService;
    private TAG_NAME: string = "ITMods-PoolStatus";

    constructor(containerService: IContainerService) {
        this.containerService = containerService;
    }

    public GetFreeMemberIDs(): Promise<string[]> {
        return new Promise<string[]>(async (resolve, reject) => {
            try {
                let deploymentNames = await this.containerService.GetDeploymentsByTag(this.TAG_NAME, "Free");
                resolve(deploymentNames);
            } catch (err) {
                reject(err);
            }
        });
    }

    public GetInUseMemberIDs(): Promise<Array<string>>{
        return new Promise<string[]>(async (resolve, reject) => {
            try {
                let deploymentNames = await this.containerService.GetDeploymentsByTag(this.TAG_NAME, "InUse");
                resolve(deploymentNames);
            } catch (err) {
                reject(err);
            }
        });
    }
    
    public UpdateMember(memberId: string, inUse: boolean): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                await this.containerService.UpdateDeploymentTag(memberId, 
                    "ITMods-PoolStatus", inUse ? "InUse" : "Free");
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }
}