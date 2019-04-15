//
// Provides operations over a pool of resources
//
import { IContainerService } from "../commonTypes";
import { IConfigurationService } from "../configService";
import { IPoolStateStore } from "./poolStateStore";

interface IContainerInstancePool {
    GetPooledContainerInstance(numCpu: number, memoryInGB: number, tag: string): Promise<string>
    InitializePool(): Promise<void>;
}

export class ContainerInstancePool implements IContainerInstancePool {
    private poolStateStore: IPoolStateStore;
    private containerService: IContainerService;
    private configService: IConfigurationService;

    constructor(poolStateStore: IPoolStateStore, containerService: IContainerService, configService: IConfigurationService) {
        this.poolStateStore = poolStateStore;
        this.containerService = containerService;
        this.configService = configService;
    }

    // InitializePool
    public async InitializePool(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            // 0.   Read base configuration
            const config = this.configService.GetConfiguration();

            // 1.   Load saved config of pool
            const poolState = await this.poolStateStore.GetMemberIDs();
            const n = poolState.length;

            // 2.   If len(config) > 0, verify that saved state matches deployed state
            if (n > 0){
                // TODO: Make sure total count of running equals memberID count, and that sets are equal
            }

            // 3.   If len(config) = 0, create a new instance up to the min size defined in POOL_MINIMUM_SIZE
            if (n === 0){
                for (let j = 0; j < config.PoolMinimumSize; j++){
                    // TODO: What spec to initialize with? Guessing with 2x2 for now
                    let newMember = await this.containerService.CreateNewDeployment(2, 2, undefined);
                    await this.poolStateStore.AddMemberID(newMember.id!, false);
                }
            }
        });
    }

    // Get Pooled ContainerGgroup
    public async GetPooledContainerInstance(numCpu: number, memoryInGB: number, tag: string): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            try {
                // 0.   Read base configuration
                const config = this.configService.GetConfiguration();

                // 1.	Read currently "running" CI's that are not already in-use
                // 2.	Sort list by name (alpha, ascending) and store as L
                const runningIDs = await this.poolStateStore.GetFreeMemberIDs();
                runningIDs.sort();
                
                // 3.	Store count as N
                const n = runningIDs.length;

                // 4.	If N >= POOL_MINIMUM_SIZE
                //    a.	Return first running CI (L[0]), and mark as in-use.
                if (n >= config.PoolMinimumSize){
                    resolve(runningIDs[0]);
                }

                // 5.	If N < POOL_MINIMUM_SIZE and N > 0
                //    a.	Return first running CI (L[0]), and mark as in-use.
                //    b.	Trigger a background creation to fill empty slot
                if ((n < config.PoolMinimumSize) && (n > 0)){
                    this.containerService.CreateNewDeployment(numCpu, memoryInGB, tag);
                    resolve(runningIDs[0]);
                }

                // 6.	If N < POOL_MINIMUM_SIZE or N = 0:
                //    a.	Create new instance
                //    b.	Store name as in-use list
                //    c.	Wait for startup acknowledgment and return info to caller.
                if ((n < config.PoolMinimumSize) || (n === 0)){
                    let newInstance = await this.containerService.CreateNewDeployment(numCpu, memoryInGB, tag);
                    await this.poolStateStore.AddMemberID(newInstance.id!, true);
                    resolve(newInstance.id);
                }
            } catch (err) {
                reject(err);
            }
        });
    }
}