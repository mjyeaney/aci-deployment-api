//
// This background job is responsible for removing stopped/terminated deployments.
//

import { ILogger, ContainerGroupStatus, ITask, TaskScheduleInfo, IContainerInstancePool, IContainerService } from "../commonTypes";
import { ContainerGroup } from "azure-arm-containerinstance/lib/models";

export class PurgeStoppedDeployments implements ITask {
    private readonly poolService: IContainerInstancePool;
    private readonly aci: IContainerService;
    private readonly logger: ILogger;

    public Name: string = "PurgeStoppedDeployments";
    
    constructor(logger: ILogger, pool: IContainerInstancePool, aci: IContainerService){
        this.logger = logger;
        this.poolService = pool;
        this.aci = aci;
    }

    public GetScheduleInfo(): TaskScheduleInfo {
        this.logger.Write("Retreiving task schedule infomation for [PurgeStoppedDeployments]...");
        const config = new TaskScheduleInfo();
        config.Enabled = true;
        config.Interval = "PT5M";
        return config;
    }
    
    public async Run(): Promise<void> {
        this.logger.Write("Running [PurgeUnusedDeployments] task...");
        
        // Get all deployment details
        let itemsToRemove: ContainerGroup[] = [];
        let containerGroups = await this.aci.GetFullConatinerDetails();

        // Find any that are stopped / terminated
        for (let c of containerGroups){

            let currentState = c.containers[0]!.instanceView!.currentState!;

            if ((currentState.state!.toLowerCase() === ContainerGroupStatus.Stopped) ||
                (currentState.state!.toLowerCase() === ContainerGroupStatus.Terminated)) {

                this.logger.Write(`Found instance candidate for removal: ${c.name}`);
                itemsToRemove.push(c);
            }
        }

        // Delete these resources
        this.logger.Write(`Removing ${itemsToRemove.length} expired instances...`);
        for (let d of itemsToRemove){
            this.logger.Write(`Removing ${d.name}..`);

            // Until we implement singleton locking, mutliple nodes may be running this 
            // code, causing a 404/not found on certain delete calls. Only an issue as jobs scale out
            try {
                await this.poolService.RemovePooledContainerInstance(d.name!);
            }
            catch (err){
                this.logger.Write(`[ERROR] - ${JSON.stringify(err)}`);
            }
        }
    }
}
