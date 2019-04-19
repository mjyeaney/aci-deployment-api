//
// Provides operations over a pool of resources
//
import { IContainerService, ILogger } from "../commonTypes";
import { ContainerGroup } from "azure-arm-containerinstance/lib/models";
import { IConfigurationService } from "../configService";
import { IPoolStateStore } from "./poolStateStore";

export interface IContainerInstancePool {
    Initialize(): Promise<void>;
    GetPooledContainerInstance(numCpu: number, memoryInGB: number, tag: string): Promise<ContainerGroup>;
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
    public async Initialize(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                // 0.   Read base configuration
                this.logger.Write("Reading base configuration...");
                const config = this.configService.GetConfiguration();

                // 1.   Load saved config of pool
                this.logger.Write("Reading pool members...");
                const freeMembers = await this.poolStateStore.GetFreeMemberIDs();
                const n = freeMembers.length;

                // 2. If (n < POOL_MINIMUM_SIZE), create new instances up to that size
                this.logger.Write(`Found ${n} free members; adding pool members`);
                const membersToCreate = config.PoolMinimumSize - n;
                for (let j = 0; j < membersToCreate; j++){
                    // TODO: What spec to initialize with? Guessing with 2x2 for now
                    (async () => {
                        try {
                            this.logger.Write("Creating pool member...");
                            let newMember = await this.containerService.CreateNewDeployment(2, 2, undefined);
                            this.logger.Write(`Done - adding member ${newMember.id} to pool state store`);
                            await this.poolStateStore.UpdateMember(newMember.id!, false);
                        } catch (err) {
                            this.logger.Write(`*******ERROR in Background Task*********`);
                            this.logger.Write(err);
                        }
                    })();
                }

                // Done
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    // Get Pooled ContainerGgroup
    public async GetPooledContainerInstance(numCpu: number, memoryInGB: number, tag: string): Promise<ContainerGroup> {
        return new Promise<ContainerGroup>(async (resolve, reject) => {
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
                if (n > config.PoolMinimumSize){
                    this.logger.Write("Found available member! Returning available instance.");
                    let candidateId = runningIDs[0];
                    await this.poolStateStore.UpdateMember(candidateId, true);
                    let containerGroup = await this.containerService.GetDeployment(candidateId);
                    resolve(containerGroup);
                }

                // 5.	If N < POOL_MINIMUM_SIZE and N > 0
                //    a.	Return first running CI (L[0]), and mark as in-use.
                //    b.	Trigger a background creation to fill empty slot
                if ((n <= config.PoolMinimumSize) && (n > 0)){
                    this.logger.Write("Found available member, but below POOL_MINIMUM_SIZE. Returning available instance.");
                    let candidateId = runningIDs[0];
                    await this.poolStateStore.UpdateMember(candidateId, true);
                    let containerGroup = await this.containerService.GetDeployment(candidateId);
                    resolve(containerGroup);

                    this.logger.Write("Initiating background instance creation.");
                    let newInstance = await this.containerService.CreateNewDeployment(numCpu, memoryInGB, tag);
                    await this.poolStateStore.UpdateMember(newInstance.name!, true);
                }

                // 6.	If N < POOL_MINIMUM_SIZE or N = 0:
                //    a.	Create new instance
                //    b.	Store name as in-use list
                //    c.	Wait for startup acknowledgment and return info to caller.
                if ((n < config.PoolMinimumSize) || (n === 0)){
                    this.logger.Write("No available instances found - creating new deployment...");
                    let newInstance = await this.containerService.CreateNewDeployment(numCpu, memoryInGB, tag);
                    await this.poolStateStore.UpdateMember(newInstance.name!, true);
                    resolve(newInstance);
                }
            } catch (err) {
                reject(err);
            }
        });
    }
}