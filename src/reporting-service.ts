//
// Provides serivces for generating and reading overview summary status
//
import * as moment from "moment";
import { OverviewDetails, SequenceSummary, IContainerService, ILogger, IReportingService } from "./common-types";

export class ReportingService implements IReportingService {
    private readonly logger: ILogger;
    private readonly aci: IContainerService;
    private refreshIntervalMs: number;
    private refreshIntervalConfig: string = process.env.REPORTING_REFRESH_INTERVAL || "PT1M";
    private details: OverviewDetails = new OverviewDetails();

    private readonly MAX_SAMPLES: number = 60;

    constructor(logger: ILogger, containerService: IContainerService) {
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
            // Any other work to do?
            resolve(this.details);
        }).finally(() => {
            const duration = Date.now() - start;
            this.logger.Write(`::GetOverviewDetails duration: ${duration} ms`);
        });
    }

    private async gatherAndUpdateMetrics() {
        // Read current data for safe mutation
        let current = this.details;

        // Read total instance counts and update total + buckets
        let currentGroups = await this.aci.GetFullConatinerDetails();
        let runningCount = currentGroups.filter(g => g.instanceView!.state === "Running").length;
        let stoppedCount = currentGroups.length - runningCount;

        current.RunningInstances = runningCount;
        current.StoppedInstances = stoppedCount;
        current.RunningInstanceCounts.push(runningCount);
        current.StoppedInstanceCounts.push(stoppedCount);

        // Apply clamping and summarze resulting stream
        current.RunningInstanceCounts = current.RunningInstanceCounts.slice(-1 * this.MAX_SAMPLES);
        current.StoppedInstanceCounts = current.StoppedInstanceCounts.slice(-1 * this.MAX_SAMPLES);
        current.RunningSummary = this.getSequenceSummary(current.RunningInstanceCounts);
        current.StoppedSummary = this.getSequenceSummary(current.StoppedInstanceCounts);

        // Update live data
        this.details = current;
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