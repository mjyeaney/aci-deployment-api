//
// Implements background cleanup tasks within the applicaiton. This includes (but is not limited to)
// removal of un-used container groups that have not been started within configured intervals, cleanup 
// of any orphaned "pending" deployments, etc.
//

import { ILogger, IContainerService, ITaskRunner, ITask } from "../commonTypes";
import { PurgeUnusedDeployments } from "./purgeUnusedDeployments";
import * as moment from "moment";

export class DefaultTaskRunner implements ITaskRunner {
    private readonly logger: ILogger;
    private tasks: ITask[] = [];

    constructor(logger: ILogger, aci: IContainerService){
        this.logger = logger;

        // Add known tasks - later, we can dynamically enumerate these tasks 
        // and filter by those which are enabled / etc.
        this.tasks.push(new PurgeUnusedDeployments(logger, aci));
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