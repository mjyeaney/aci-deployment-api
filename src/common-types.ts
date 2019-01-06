//
// Common type definitions shared between client and server.
// Mostly used for REST api contracts.
//

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

export class ConfigurationDetails {
    TenantId: string | undefined;
    SubscriptionId: string | undefined;
    Region: string | undefined;
    ResourceGroup: string | undefined;
    ContainerImage: string | undefined;
    ContainerPort: number | undefined;
    ContainerOs: string | undefined;
    ReportingRefreshInterval: string | undefined;
}