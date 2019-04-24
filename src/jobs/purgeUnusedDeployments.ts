//
// Implements background cleanup tasks within the applicaiton. This includes (but is not limited to)
// removal of un-used container groups that have not been started within configured intervals, cleanup 
// of any orphaned "pending" deployments, etc.
//

import { ILogger, IContainerService, ContainerGroupStatus, ITask, TaskScheduleInfo } from "../commonTypes";
import { ContainerGroup } from "azure-arm-containerinstance/lib/models";
import { IPoolStateStore } from "../pooling/poolStateStore";

export class PurgeUnusedDeployments implements ITask {
    private readonly aci: IContainerService;
    private readonly poolStateStore: IPoolStateStore;
    private readonly logger: ILogger;

    public Name: string = "PurgeUnusedDeployments";
    
    constructor(logger: ILogger, aci: IContainerService, poolStateStore: IPoolStateStore){
        this.logger = logger;
        this.aci = aci;
        this.poolStateStore = poolStateStore;
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
                await this.aci.DeleteDeployment(d.name!);
            }
            catch (err){
                this.logger.Write(`[ERROR] - ${JSON.stringify(err)}`);
            }
        }

        // TODO: Replace deleted instances with new members, and mark them as available
        const tasks: Array<Promise<void>> = [];
        for (let c = 0; c < itemsToRemove.length; c++){
            // Firing these creates in parallel to minmize delays
            tasks.push((async() => {
                try {
                    // TODO: What spec to initialize with? Guessing with 2x2 for now
                    // NOTE: This is a 'sync' creation, because the ARM/MSREST lib won't allow an update 
                    // while another update is pending (even though it works).
                    this.logger.Write(`Creating replacement member ${c}...`);
                    let newMember = await this.aci.CreateNewDeploymentSync(2, 2, undefined);

                    this.logger.Write(`Done - adding member '${newMember.id}' to pool state store`);
                    await this.poolStateStore.UpdateMember(newMember.id!, false);
                } catch (err) {
                    this.logger.Write(`**********ERROR during cleanup background task**********: ${JSON.stringify(err)}`);
                }
            })());
        }

        // Wait for all work to finish before returning
        await Promise.all(tasks);
    }
}
