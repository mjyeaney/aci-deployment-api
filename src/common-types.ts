//
// Common type definitions shared between client and server.
// Mostly used for REST api contracts.
//

import { ContainerGroupListResult, ContainerGroup } from "azure-arm-containerinstance/lib/models";

export interface ILogger {
    // Logs a message (async) to an underlying storage provider
    Write(message: string): void;
}

export interface IContainerService {
    GetDeployments(): Promise<ContainerGroupListResult>;
    GetDeployment(containerGroupName: string): Promise<ContainerGroup>;
    CreateNewDeployment(numCpu: number, memoryInGB: number): Promise<ContainerGroup>;
    StopDeployment(containerGroupName: string): Promise<void>;
    DeleteDeployment(containerGroupName: string): Promise<void>;
    GetMatchingGroupInfo(numCpu: number, memoryInGB: number): Promise<GroupMatchInformation>;
    GetFullConatinerDetails(): Promise<ContainerGroup[]>;
}

export class GroupMatchInformation {
    Name: string = "";
    Group: ContainerGroup | undefined = undefined;
}

export interface IReportingService {
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

export class ContainerGroupGridRow {
    Name?: string;
    Status?: string;
    CpuCount: number = 0;
    MemoryInGB: number = 0;
    IpAddress?: string;
    OsType?: string;
}