//
// Provides operations over a pool of resources
//
import { IContainerService, ILogger } from "../commonTypes";
import { ContainerGroup } from "azure-arm-containerinstance/lib/models";
import { IConfigurationService } from "../configService";
import { IPoolStateStore } from "./poolStateStore";
import * as lockfile from "proper-lockfile";

export interface IContainerInstancePool {
    Initialize(): Promise<void>;
    GetPooledContainerInstance(numCpu: number, memoryInGB: number, tag: string): Promise<ContainerGroup>;
}

export class ContainerInstancePool implements IContainerInstancePool {
    private readonly INIT_ROOT_FILE_PATH: string = "./data/init.lock";
    private readonly SYNC_ROOT_FILE_PATH: string = "./data/aci.lock";
    
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
                // This only should run on a single instance
                await lockfile.lock(this.INIT_ROOT_FILE_PATH);
                this.logger.Write(`Entered critical section for ::Initialize()`);

                // 0.   Read base configuration
                this.logger.Write("Reading base configuration...");
                const config = this.configService.GetConfiguration();

                // 1.   Load saved config of pool
                this.logger.Write("Reading pool members...");
                const freeMembers = await this.poolStateStore.GetFreeMemberIDs();
                const n = freeMembers.length;

                // 2. If (n < POOL_MINIMUM_SIZE), create new instances up to that size
                this.logger.Write(`Found ${n} free members..`);
                const membersToCreate = config.PoolMinimumSize - n;

                this.logger.Write(`Scheduling creation of ${membersToCreate} new members..`);
                const tasks: Array<Promise<void>> = [];

                for (let j = 0; j < membersToCreate; j++){
                    // Firing these creates in parallel to minmize delays
                    tasks.push((async() => {
                        try {
                            // TODO: What spec to initialize with? Guessing with 2x2 for now
                            // NOTE: This is a 'sync' creation, because the ARM/MSREST lib won't allow an update 
                            // while another update is pending (even though it works).
                            this.logger.Write(`Creating pool member ${j}...`);
                            let newMember = await this.containerService.CreateNewDeploymentSync(2, 2, undefined);

                            this.logger.Write(`Done - adding member '${newMember.id}' to pool state store`);
                            await this.poolStateStore.UpdateMember(newMember.id!, false);
                        } catch (err) {
                            this.logger.Write(`**********ERROR during inititialization background task**********: ${JSON.stringify(err)}`);
                        }
                    })());
                }

                // Wait for all work to finish
                await Promise.all(tasks);

                // Done
                resolve();
            } catch (err) {
                reject(err);
            }
            finally {
                await lockfile.unlock(this.INIT_ROOT_FILE_PATH);
                this.logger.Write(`Critical section finished for ::Initialize()`);
            }
        });
    }

    // Get Pooled ContainerGgroup
    public async GetPooledContainerInstance(numCpu: number, memoryInGB: number, tag: string): Promise<ContainerGroup> {
        return new Promise<ContainerGroup>(async (resolve, reject) => {
            try {
                await lockfile.lock(this.SYNC_ROOT_FILE_PATH, { retries: 5 });
                this.logger.Write(`Entered critical section for ::GetPooledContainerInstance`);

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
                    let deploymentName = candidateId.substr(candidateId.lastIndexOf('/') + 1);
                    let containerGroup = await this.containerService.GetDeployment(deploymentName);

                    resolve(containerGroup);
                }

                // 5.	If N < POOL_MINIMUM_SIZE and N > 0
                //    a.	Return first running CI (L[0]), and mark as in-use.
                //    b.	Trigger a background creation to fill empty slot
                if ((n <= config.PoolMinimumSize) && (n > 0)){
                    this.logger.Write("Found available member, but below POOL_MINIMUM_SIZE. Returning available instance.");
                    let candidateId = runningIDs[0];
                    await this.poolStateStore.UpdateMember(candidateId, true);

                    // NOTE the pool stores the entire resource ID; only need the deployment ID to retrieve details
                    let deploymentName = candidateId.substr(candidateId.lastIndexOf('/') + 1);
                    let containerGroup = await this.containerService.GetDeployment(deploymentName);

                    resolve(containerGroup);

                    // Fire background task to create new member - Cleanup tasks will normalize over-provisioning
                    (async () => {
                        try {
                            this.logger.Write("Initiating background instance creation.");
                            let newInstance = await this.containerService.CreateNewDeploymentSync(numCpu, memoryInGB, tag);
                            await this.poolStateStore.UpdateMember(newInstance.id!, false);
                        } catch (err) {
                            this.logger.Write(`**********ERROR during background task**********:\n${JSON.stringify(err)}`);
                        }
                    })();
                }

                // 6.	If N = 0:
                //    a.	Create new instance
                //    b.	Store name as in-use list
                //    c.	Wait for startup acknowledgment and return info to caller.
                // OR.....
                //    a.    Throw exception and tell clients to try again later, but start a background deployment
                if (n === 0){
                    this.logger.Write("No available instances found - creating new deployment...");
                    //let newInstance = await this.containerService.CreateNewDeploymentSync(numCpu, memoryInGB, tag);
                    //await this.poolStateStore.UpdateMember(newInstance.id!, true);
                    //resolve(newInstance);

                    // Fire background task to create a replacement - Cleanup tasks will normalize over-provisioning.
                    (async () => {
                        try {
                            this.logger.Write("Initiating background instance creation.");
                            let newInstance = await this.containerService.CreateNewDeploymentSync(numCpu, memoryInGB, tag);
                            await this.poolStateStore.UpdateMember(newInstance.id!, false);
                        } catch (err) {
                            this.logger.Write(`**********ERROR during background task**********:\n${JSON.stringify(err)}`);
                        }
                    })();

                    // Make sure to reject
                    throw "No available computer instances; please try again later.";
                }
            } catch (err) {
                reject(err);
            } finally {
                await lockfile.unlock(this.SYNC_ROOT_FILE_PATH);
                this.logger.Write(`Critical section finished for ::GetPooledContainerInstance()`);
            }
        });
    }
}