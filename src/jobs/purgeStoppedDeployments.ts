//
// Implements background cleanup tasks within the applicaiton. This includes (but is not limited to)
// removal of un-used container groups that have not been started within configured intervals, cleanup 
// of any orphaned "pending" deployments, etc.
//

import { ILogger, ContainerGroupStatus, ITask, TaskScheduleInfo, IContainerInstancePool, IContainerService } from "../commonTypes";
import { ContainerGroup } from "azure-arm-containerinstance/lib/models";

export class PurgeStoppedDeployments implements ITask {
    private readonly poolService: IContainerInstancePool;
    private readonly aci: IContainerService;
    private readonly logger: ILogger;

    public Name: string = "PurgeUnusedDeployments";
    
    constructor(logger: ILogger, pool: IContainerInstancePool, aci: IContainerService){
        this.logger = logger;
        this.poolService = pool;
        this.aci = aci;
    }

    public GetScheduleInfo(): TaskScheduleInfo {
        this.logger.Write("Retreiving task schedule infomation for [PurgeUnusedDeployments]...");
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
            // code, causing a 404 on certain delete calls. 
            try {
                await this.poolService.RemovePooledContainerInstance(d.id!);
            }
            catch (err){
                this.logger.Write(`[ERROR] - ${JSON.stringify(err)}`);
            }
        }
    }
}
