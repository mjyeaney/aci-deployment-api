//
// Implements background cleanup tasks within the applicaiton. This includes (but is not limited to)
// removal of un-used container groups that have not been started within configured intervals, cleanup 
// of any orphaned "pending" deployments, etc.
//

import { ILogger, IContainerService, ContainerGroupStatus, IPendingOperationCache } from "./common-types";
import * as moment from "moment";
import { ContainerGroup } from "azure-arm-containerinstance/lib/models";

export interface ICleanupTaskRunner {
    ScheduleAll(): void;
}

export class CleanupTaskScheduleInfo {
    Interval: string = "";
}

export interface ICleanupTask {
    GetScheduleInfo(): CleanupTaskScheduleInfo;
    Run(): Promise<void>;
}

export class CleanupTaskRunner implements ICleanupTaskRunner {
    private readonly logger: ILogger;
    private tasks: ICleanupTask[] = [];

    constructor(logger: ILogger, pendingOps: IPendingOperationCache, aci: IContainerService){
        this.logger = logger;

        // Add known tasks
        this.tasks.push(new PurgeUnusedDeployments(logger, pendingOps, aci));
    }

    public ScheduleAll(): void {
        for (let t of this.tasks){
            let config = t.GetScheduleInfo();
            let intervalMs = moment.duration(config.Interval).asMilliseconds();

            let scheduleFn = () => {
                let hoistedTask = t;
                let hoistedCallback = scheduleFn;
                let hoistedInterval = intervalMs;

                setTimeout(async () => {
                    await hoistedTask.Run();
                    hoistedCallback();
                }, hoistedInterval);
            };

            scheduleFn();
        }
    }
}

export class PurgeUnusedDeployments implements ICleanupTask {
    private readonly aci: IContainerService;
    private readonly pendingOps: IPendingOperationCache;
    private readonly logger: ILogger;
    
    constructor(logger: ILogger, pendingOps: IPendingOperationCache, aci: IContainerService){
        this.logger = logger;
        this.pendingOps = pendingOps
        this.aci = aci;
    }

    public GetScheduleInfo(): CleanupTaskScheduleInfo {
        this.logger.Write("Retreiving task schedule infomation for [PurgeUnusedDeployments]...");
        const config = new CleanupTaskScheduleInfo();
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

            if (c.instanceView!.state){
                if ((c.instanceView!.state!.toLowerCase() === ContainerGroupStatus.Stopped) ||
                    (c.instanceView!.state!.toLowerCase() === ContainerGroupStatus.Terminated)) {

                    this.logger.Write(`Found instance candidate for removal: ${c.name}`);

                    // Found a candidate deployment - check last update
                    let lastUpdate = c.containers[0]!.instanceView!.currentState!.finishTime;

                    // Finish time may be null; if so, revert to start time
                    if (!lastUpdate){
                        lastUpdate = c.containers[0]!.instanceView!.currentState!.startTime;
                    }

                    let diff = moment().diff(moment(lastUpdate));
                    let duration = moment.duration(diff).asHours();

                    this.logger.Write(`Instance last update: ${duration} hours ago`);

                    if (duration >= 1){
                        await this.pendingOps.AddPendingDeploymentName(c.name!);
                        itemsToRemove.push(c);
                    }
                }
            }

        }

        // Delete these resources
        this.logger.Write(`Removing ${itemsToRemove.length} expired instances...`);
        for (let d of itemsToRemove){
            this.logger.Write(`Removing ${d.name}..`);
            await this.aci.DeleteDeployment(d.name!);
            await this.pendingOps.RemoveDeploymentName(d.name!);
        }
    }
}