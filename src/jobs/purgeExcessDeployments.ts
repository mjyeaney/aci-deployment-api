//
// This background job is responsible for removing stopped/terminated deployments.
//

import { ILogger, ITask, TaskScheduleInfo, IContainerInstancePool } from "../commonTypes";

export class PurgeExcessDeployments implements ITask {
    private readonly logger: ILogger;
    private readonly pool: IContainerInstancePool;

    public Name: string = "PurgeExcessDeployments";

    constructor(logger: ILogger, pool: IContainerInstancePool){
        this.logger = logger;
        this.pool = pool;
    }

    public GetScheduleInfo(): TaskScheduleInfo {
        this.logger.Write("Retreiving task schedule infomation for [PurgeExcessDeployments]...");
        const config = new TaskScheduleInfo();
        config.Enabled = true;
        config.Interval = "PT3M";
        return config;
    }

    public async Run(): Promise<void> {
        this.logger.Write("Running [PurgeExcessDeployments] task...");
        this.pool.RemoveExcessFreeMembers();
    }
}