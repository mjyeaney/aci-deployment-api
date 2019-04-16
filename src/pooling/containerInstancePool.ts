//
// Provides operations over a pool of resources
//
import { IContainerService, ILogger } from "../commonTypes";
import { IConfigurationService } from "../configService";
import { IPoolStateStore } from "./poolStateStore";

export interface IContainerInstancePool {
    GetPooledContainerInstance(numCpu: number, memoryInGB: number, tag: string): Promise<string>
    InitializePool(): Promise<void>;
}

export class ContainerInstancePool implements IContainerInstancePool {
    private poolStateStore: IPoolStateStore;
    private containerService: IContainerService;
    private configService: IConfigurationService;
    private logger: ILogger;

    constructor(poolStateStore: IPoolStateStore, containerService: IContainerService, configService: IConfigurationService, logger: ILogger) {
        this.poolStateStore = poolStateStore;
        this.containerService = containerService;
        this.configService = configService;
        this.logger = logger;
    }

    // InitializePool
    public async InitializePool(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                // 0.   Read base configuration
                this.logger.Write("Reading base configuration...");
                const config = this.configService.GetConfiguration();

                // 1.   Load saved config of pool
                this.logger.Write("Reading pool members...");
                const poolState = await this.poolStateStore.GetMembers();
                const n = poolState.length;

                // 2.   If len(config) > 0, verify that saved state matches deployed state
                this.logger.Write("Found saved pool members - verifying against running deployments");
                if (n > 0){
                    // Make sure total count of running equals memberID count, and that sets are equal
                    let runningInstances = await this.containerService.GetDeployments();
                    if (n !== runningInstances.length){
                        // ERROR: Mismatch...running instances don't match DB state
                    }
                }

                // 3.   If len(config) = 0, create a new instance up to the min size defined in POOL_MINIMUM_SIZE
                this.logger.Write("Found no saved pool members - creating initial deployments");
                if (n === 0){
                    for (let j = 0; j < config.PoolMinimumSize; j++){
                        // TODO: What spec to initialize with? Guessing with 2x2 for now
                        this.logger.Write("Creating pool member...");
                        let newMember = await this.containerService.CreateNewDeployment(2, 2, undefined);
                        this.logger.Write(`Done - adding member ${newMember.id} to pool state store`);
                        await this.poolStateStore.AddMember(newMember.id!, false);
                    }
                }

                // Done
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    // Get Pooled ContainerGgroup
    public async GetPooledContainerInstance(numCpu: number, memoryInGB: number, tag: string): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            try {
                // 0.   Read base configuration
                this.logger.Write("Reading base configuration...");
                const config = this.configService.GetConfiguration();

                // 1.	Read currently "running" CI's that are not already in-use
                // 2.	Sort list by name (alpha, ascending) and store as L
                this.logger.Write("Reading free members ID's from pool...");
                const runningIDs = await this.poolStateStore.GetFreeMemberIDs();
                runningIDs.sort();
                
                // 3.	Store count as N
                const n = runningIDs.length;
                this.logger.Write(`Found ${n} free members`);

                // 4.	If N >= POOL_MINIMUM_SIZE
                //    a.	Return first running CI (L[0]), and mark as in-use.
                if (n >= config.PoolMinimumSize){
                    this.logger.Write("Found available member! Returning available instance.");
                    let candidateId = runningIDs[0];
                    await this.poolStateStore.UpdateMember(candidateId, true);
                    resolve(candidateId);
                }

                // 5.	If N < POOL_MINIMUM_SIZE and N > 0
                //    a.	Return first running CI (L[0]), and mark as in-use.
                //    b.	Trigger a background creation to fill empty slot
                if ((n < config.PoolMinimumSize) && (n > 0)){
                    this.logger.Write("Found available member, but below POOL_MINIMUM_SIZE. Returning available instance.");
                    let candidateId = runningIDs[0];
                    await this.poolStateStore.UpdateMember(candidateId, true);
                    resolve(runningIDs[0]);

                    this.logger.Write("Initiating background instance creation.");
                    this.containerService.CreateNewDeployment(numCpu, memoryInGB, tag);
                }

                // 6.	If N < POOL_MINIMUM_SIZE or N = 0:
                //    a.	Create new instance
                //    b.	Store name as in-use list
                //    c.	Wait for startup acknowledgment and return info to caller.
                if ((n < config.PoolMinimumSize) || (n === 0)){
                    this.logger.Write("No available instances found - creating new deployment...");
                    let newInstance = await this.containerService.CreateNewDeployment(numCpu, memoryInGB, tag);
                    await this.poolStateStore.AddMember(newInstance.id!, true);
                    resolve(newInstance.id);
                }
            } catch (err) {
                reject(err);
            }
        });
    }
}