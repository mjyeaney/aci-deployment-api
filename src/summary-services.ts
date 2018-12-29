//
// Provides serivces for generating and reading overview summary status
//
import { IContainerServices, ContainerServices} from "./container-services";
import { ILogger } from "./logging";

export interface ISummaryServices
{
    GetOverviewDetails(): Promise<OverviewDetails>;
}

export class OverviewDetails
{
    RunningInstances: number = 0;
    StoppedInstances: number = 0;
    RunningInstanceCounts: number[] = [];
    StoppedInstanceCounts: number[] = [];
}

export class SummaryServices implements ISummaryServices
{
    private readonly logger: ILogger;
    private readonly aci: IContainerServices;
    private tempData: OverviewDetails = new OverviewDetails();
    
    constructor(logger: ILogger, containerService: IContainerServices)
    {
        this.logger = logger;
        this.aci = containerService;

        // Start background timer for this server instance to gather and report data
        // Interval here is PT1M...shoudl likely pull in Moment correctly handle duration types
        this.logger.Write("Starting SummaryServices background timer...");
        setInterval(() => {
            this.gatherAndUpdateMetrics();
        }, 1 * 60 * 1000);

        // Run the update method once on startup (but need to wait for init to be complete)
        // const waitForAciSerivceInit = () => {
        //     if (!this.aci.InitializationComplete){
        //         setTimeout(waitForAciSerivceInit, 1000);
        //     } else {
        //         this.gatherAndUpdateMetrics();
        //     }
        // };
        // waitForAciSerivceInit();

        this.gatherAndUpdateMetrics();
    }

    public GetOverviewDetails()
    {
        this.logger.Write("Starting ::GetOverviewDetails...");
        const start = Date.now();
        return new Promise<OverviewDetails>((resolve, reject) => {
            resolve(this.tempData);
        }).finally(() => {
            const duration = Date.now() - start;
            this.logger.Write(`::GetOverviewDetails duration: ${duration} ms`);
        });
    }

    private async gatherAndUpdateMetrics()
    {
        // Read current data
        let currentData = this.tempData;

        // Read total instance counts and update total + buckets
        let currentGroups = await this.aci.GetFullConatinerDetails();
        let runningCount = currentGroups.filter((g) => {
            return g.instanceView!.state === "Running";
        }).length;
        let stoppedCount = currentGroups.length - runningCount;

        currentData.RunningInstances = runningCount;
        currentData.StoppedInstances = stoppedCount;
        currentData.RunningInstanceCounts.push(runningCount);
        currentData.StoppedInstanceCounts.push(stoppedCount);

        // Apply clamping
        currentData.RunningInstanceCounts = currentData.RunningInstanceCounts.slice(-144);
        currentData.StoppedInstanceCounts = currentData.StoppedInstanceCounts.slice(-144);

        // Write new file
        this.tempData = currentData;
    }
}