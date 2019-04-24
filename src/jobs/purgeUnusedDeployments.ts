//
// Implements background cleanup tasks within the applicaiton. This includes (but is not limited to)
// removal of un-used container groups that have not been started within configured intervals, cleanup 
// of any orphaned "pending" deployments, etc.
//

import { ILogger, IContainerService, ContainerGroupStatus, ITask, TaskScheduleInfo } from "../commonTypes";
import * as moment from "moment";
import { ContainerGroup } from "azure-arm-containerinstance/lib/models";

export class PurgeUnusedDeployments implements ITask {
    private readonly aci: IContainerService;
    private readonly logger: ILogger;
    
    constructor(logger: ILogger, aci: IContainerService){
        this.logger = logger;
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

        // Find any that are stopped or terminated, that have no updates for 10 mins
        for (let c of containerGroups){

            let currentState = c.containers[0]!.instanceView!.currentState!;

            if ((currentState.state!.toLowerCase() === ContainerGroupStatus.Stopped) ||
                (currentState.state!.toLowerCase() === ContainerGroupStatus.Terminated)) {

                this.logger.Write(`Found instance candidate for removal: ${c.name}`);

                // Found a candidate deployment - check last update
                let lastUpdate = currentState.finishTime;

                // Finish time may be null; if so, revert to start time
                if (!lastUpdate){
                    lastUpdate = currentState.startTime;
                }

                let diff = moment().diff(moment(lastUpdate));
                let duration = moment.duration(diff).asHours();

                this.logger.Write(`Instance last update: ${duration} hours ago`);

                if (duration >= 4){
                    itemsToRemove.push(c);
                }
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
    }
}
