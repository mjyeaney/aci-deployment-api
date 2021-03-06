//
// Implements background cleanup tasks within the applicaiton. This includes (but is not limited to)
// removal of un-used container groups that have not been started within configured intervals, cleanup 
// of any orphaned "pending" deployments, etc.
//

import * as moment from "moment";
import { ILogger, IContainerService, ITaskRunner, ITask, IContainerInstancePool } from "../commonTypes";
import { PurgeStoppedDeployments } from "./purgeStoppedDeployments";
import { PurgeExcessDeployments } from "./purgeExcessDeployments";
import { RestorePoolDeployments } from "./restorePoolDeployments";

export class DefaultTaskRunner implements ITaskRunner {
    private readonly logger: ILogger;
    private tasks: ITask[] = [];

    constructor(logger: ILogger, pool: IContainerInstancePool, aci: IContainerService){
        this.logger = logger;

        // Add known tasks - later, we can dynamically enumerate these tasks 
        // and filter by those which are enabled / etc.
        this.logger.Write("Adding tasks to DefaultTaskRunner");
        this.tasks.push(new PurgeStoppedDeployments(logger, pool, aci));
        this.tasks.push(new PurgeExcessDeployments(logger, pool));
        this.tasks.push(new RestorePoolDeployments(logger, pool));
    }

    public ScheduleAll(): void {
        this.logger.Write("Scheduling all tasks...");
        for (let t of this.tasks){
            let config = t.GetScheduleInfo();
            let intervalMs = moment.duration(config.Interval).asMilliseconds();

            let scheduleFn = () => {
                let hoistedTask = t;
                let hoistedCallback = scheduleFn;
                let hoistedInterval = intervalMs;

                setTimeout(async () => {
                    try {
                        await hoistedTask.Run();
                    } catch (err) {
                        this.logger.Write(`ERROR during scheduled job execution: ${JSON.stringify(err)}`);
                    }
                    hoistedCallback();
                }, hoistedInterval);
            };

            this.logger.Write(`Starting task ${t.Name}...`);
            scheduleFn();
        }
    }
}