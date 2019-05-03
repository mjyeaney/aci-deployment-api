//
// This background job is responsible for ensuring the pool has the configured number of 
// members.
//

import { ILogger, ITask, TaskScheduleInfo, IContainerInstancePool } from "../commonTypes";

export class RestorePoolDeployments implements ITask {
    private readonly logger: ILogger;
    private readonly pool: IContainerInstancePool;

    public Name: string = "RestorePoolDeployments";

    constructor(logger: ILogger, pool: IContainerInstancePool){
        this.logger = logger;
        this.pool = pool;
    }

    public GetScheduleInfo(): TaskScheduleInfo {
        this.logger.Write("Retreiving task schedule infomation for [RestorePoolDeployments]...");
        const config = new TaskScheduleInfo();
        config.Enabled = true;
        config.Interval = "PT3M";
        return config;
    }

    public async Run(): Promise<void> {
        this.logger.Write("Running [RestorePoolDeployments] task...");
        if (this.pool.PoolInitialized){
            this.pool.EnsureMinFreeMembers();
        }
    }
}