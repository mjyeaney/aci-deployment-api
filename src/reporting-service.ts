//
// Provides serivces for generating and reading overview summary status
//
import { IContainerServices, ContainerServices } from "./container-services";
import { ILogger } from "./logging";
import * as moment from "moment";

export interface ISummaryServices {
    GetOverviewDetails(): Promise<OverviewDetails>;
}

export class OverviewDetails {
    RunningInstances: number = 0;
    StoppedInstances: number = 0;
    RunningInstanceCounts: number[] = [];
    RunningSummary: SequenceSummary = new SequenceSummary();
    StoppedInstanceCounts: number[] = [];
    StoppedSummary: SequenceSummary = new SequenceSummary();
}

export class SequenceSummary {
    Minimum: number = 0;
    Maximum: number = 0;
    Average: number = 0;
}

export class SummaryServices implements ISummaryServices {
    private readonly logger: ILogger;
    private readonly aci: IContainerServices;
    private refreshIntervalMs: number;
    private refreshIntervalConfig: string = process.env.REPORTING_REFRESH_INTERVAL || "PT1M";
    private tempData: OverviewDetails = new OverviewDetails();

    constructor(logger: ILogger, containerService: IContainerServices) {
        this.logger = logger;
        this.aci = containerService;

        // Start background timer for this server instance to gather and report data
        // Interval here is PT1M
        this.logger.Write(`Configuring data refresh for ${this.refreshIntervalConfig}...`);
        this.refreshIntervalMs = moment.duration(this.refreshIntervalConfig).asMilliseconds();

        this.logger.Write("Starting SummaryServices background timer...");
        setInterval(() => {
            this.gatherAndUpdateMetrics();
        }, this.refreshIntervalMs);

        this.gatherAndUpdateMetrics();
    }

    public GetOverviewDetails() {
        this.logger.Write("Starting ::GetOverviewDetails...");
        const start = Date.now();
        return new Promise<OverviewDetails>((resolve, reject) => {
            resolve(this.tempData);
        }).finally(() => {
            const duration = Date.now() - start;
            this.logger.Write(`::GetOverviewDetails duration: ${duration} ms`);
        });
    }

    private async gatherAndUpdateMetrics() {
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
        currentData.RunningSummary = this.getSequenceSummary(currentData.RunningInstanceCounts);
        currentData.StoppedSummary = this.getSequenceSummary(currentData.StoppedInstanceCounts);

        // Write new file
        this.tempData = currentData;
    }

    private getSequenceSummary(data: number[]): SequenceSummary {
        let s = new SequenceSummary();
        s.Minimum = Number.MAX_SAFE_INTEGER;
        s.Maximum = Number.MIN_SAFE_INTEGER;
        let sum = 0.0;

        data.map((n) => {
            if (n < s.Minimum) s.Minimum = n;
            if (n > s.Maximum) s.Maximum = n;
            sum += n;
        });

        if (data.length === 0) {
            s.Minimum = 0.0;
            s.Maximum = 0.0;
            s.Average = 0.0;
        } else {
            s.Average = sum / data.length;
        }

        return s;
    }
}