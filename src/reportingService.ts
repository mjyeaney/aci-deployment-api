//
// Provides serivces for generating and reading overview summary status
//
import * as moment from "moment";
import { OverviewDetails, SequenceSummary, ILogger, IReportingService, ContainerGroupStatus } from "./commonTypes";
import { IConfigurationService } from "./configService";
import { IPoolStateStore } from "./pooling/poolStateStore";

export class ReportingService implements IReportingService {
    private readonly logger: ILogger;
    private readonly poolStateStore: IPoolStateStore;
    private refreshIntervalMs: number;
    private refreshIntervalConfig: string;
    private details: OverviewDetails = new OverviewDetails();

    private readonly MAX_SAMPLES: number = 60;

    constructor(logger: ILogger, config: IConfigurationService, poolStateStore: IPoolStateStore) {
        this.logger = logger;
        this.poolStateStore = poolStateStore;
        this.refreshIntervalConfig = config.GetConfiguration().ReportingRefreshInterval;

        // Start background timer for this server instance to gather and report data
        this.logger.Write(`Configuring data refresh for ${this.refreshIntervalConfig}...`);
        this.refreshIntervalMs = moment.duration(this.refreshIntervalConfig).asMilliseconds();
    }

    public Initialize() {
        this.logger.Write("Starting SummaryServices background tasks...");

        // Setup the background tasks
        setInterval(() => {
            this.gatherAndUpdateMetrics();
        }, this.refreshIntervalMs);

        // These calls setup the first refresh
        this.gatherAndUpdateMetrics();
    }

    public async GetOverviewDetails() {
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

        // Read pool counts
        let runningCount = (await this.poolStateStore.GetInUseMemberIDs()).length;
        let freeCount = (await this.poolStateStore.GetFreeMemberIDs()).length;

        current.InUseInstances = runningCount;
        current.FreeInstances = freeCount;
        current.InUseInstanceCounts.push(runningCount);
        current.FreeInstanceCounts.push(freeCount);

        // Apply clamping and summarze resulting stream
        current.InUseInstanceCounts = current.InUseInstanceCounts.slice(-1 * this.MAX_SAMPLES);
        current.FreeInstanceCounts = current.FreeInstanceCounts.slice(-1 * this.MAX_SAMPLES);
        current.InUseSummary = this.getSequenceSummary(current.InUseInstanceCounts);
        current.FreeSummary = this.getSequenceSummary(current.FreeInstanceCounts);

        // Update live data
        this.details = current;
    }

    private getSequenceSummary(data: number[]): SequenceSummary {
        const s = new SequenceSummary();
        s.Minimum = Number.MAX_SAFE_INTEGER;
        s.Maximum = Number.MIN_SAFE_INTEGER;
        let sum = 0.0;

        // sp/mm method..cound extend to welford's method later if needed.
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