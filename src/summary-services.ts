//
// Provides serivces for generating and reading overview summary status
//
import { IContainerServices, ContainerServices} from "./container-services";
import { ILogger, ConsoleLogger } from "./logging";
import "fs";

export interface ISummaryServices
{
    GetOverviewDetails(): Promise<OverviewDetails>;
}

export class OverviewDetails
{
    RunningInstances: number = 0;
    InstanceCountsByTime: number[] = [];
}

export class SummaryServices implements ISummaryServices
{
    private readonly logger: ILogger;
    private readonly aci: IContainerServices;
    private tempData: OverviewDetails = new OverviewDetails();
    
    constructor(containerService: IContainerServices)
    {
        this.aci = containerService;
        this.logger = new ConsoleLogger();

        // Start background timer for this server instance to gather and report data
        // Interval here is PT5M...shoudl likely pull in Moment correctly handle duration types
        this.logger.LogMessage("Starting SummaryServices background timer...");
        setInterval(() => {
            this.gatherAndUpdateMetrics();
        }, 5 * 60 * 1000);

        // Run the update method once on startup (but need to wait for init to be complete)
        const waitForAciSerivceInit = () => {
            if (!this.aci.InitializationComplete){
                setTimeout(waitForAciSerivceInit, 1000);
            } else {
                this.gatherAndUpdateMetrics();
            }
        };
        waitForAciSerivceInit();
    }

    public GetOverviewDetails()
    {
        this.logger.LogMessage("Starting ::GetOverviewDetails...");
        const start = Date.now();
        return new Promise<OverviewDetails>((resolve, reject) => {
            resolve(this.tempData);
        }).finally(() => {
            const duration = Date.now() - start;
            this.logger.LogMessage(`::GetOverviewDetails duration: ${duration} ms`);
        });
    }

    private async gatherAndUpdateMetrics()
    {
        // Read current data
        let currentData = this.tempData;

        // Read total instance counts and update total + buckets
        let currentGroups = await this.aci.GetFullConatinerDetails();
        let totalCount = currentGroups.filter((g) => {
            return g.instanceView!.state === "Running";
        }).length;

        currentData.RunningInstances = totalCount;
        currentData.InstanceCountsByTime.push(totalCount);

        // Write new file
        this.tempData = currentData;
    }
}