//
// Common type definitions shared between client and server.
// Mostly used for REST api contracts.
//

import { ContainerGroupListResult, ContainerGroup } from "azure-arm-containerinstance/lib/models";

export interface ILogger {
    Write(message: string): void;
}

export interface IContainerService {
    GetDeployments(): Promise<ContainerGroupListResult>;
    GetDeployment(containerGroupName: string): Promise<ContainerGroup>;
    CreateNewDeployment(numCpu: number, memoryInGB: number, tag: string | undefined): Promise<ContainerGroup>;
    CreateNewDeploymentSync(numCpu: number, memoryInGB: number, tag: string | undefined): Promise<ContainerGroup>;
    StopDeployment(containerGroupName: string): Promise<void>;
    DeleteDeployment(containerGroupName: string): Promise<void>;
    GetFullConatinerDetails(): Promise<ContainerGroup[]>;
    UpdateDeploymentTag(deploymentResourceId: string, tagName: string, tagValue: string): Promise<void>;
    GetDeploymentsByTag(tagName: string, tagValue: string): Promise<Array<string>>;
}

export interface IPendingOperationStore {
    GetPendingOperations(): Promise<string[]>;
    AddPendingOperation(name: string): Promise<void>;
    RemovePendingOperation(name: string): Promise<void>;
    LockStore(): Promise<() => Promise<void>>;
    UnlockStore(): Promise<void>;
}

export interface IReportingService {
    Initialize(): void;
    GetOverviewDetails(): Promise<OverviewDetails>;
}

export interface ITaskRunner {
    ScheduleAll(): void;
}

export class TaskScheduleInfo {
    Enabled: boolean = false;
    Interval: string = "";
}

export interface ITask {
    GetScheduleInfo(): TaskScheduleInfo;
    Run(): Promise<void>;
}

export enum ContainerGroupStatus {
    Running = "running",
    Pending = "pending",
    Stopped = "stopped",
    Terminated = "terminated"
}

export class AuthInfo {
    UserName: string = "";
    PrincipalName: string = "";
}

export class OverviewDetails {
    InUseInstances: number = 0;
    FreeInstances: number = 0;
    InUseInstanceCounts: number[] = [];
    InUseSummary: SequenceSummary = new SequenceSummary();
    FreeInstanceCounts: number[] = [];
    FreeSummary: SequenceSummary = new SequenceSummary();
}

export class SequenceSummary {
    Minimum: number = 0;
    Maximum: number = 0;
    Average: number = 0;
}

export class ConfigurationDetails {
    TenantId: string = "";
    SubscriptionId: string = "";
    ClientId: string = "";
    ClientSecret: string = "";
    Region: string = "";
    ResourceGroup: string = "";
    ContainerImage: string = "";
    ContainerPort: number = 0;
    ContainerOs: string = "";
    ReportingRefreshInterval: string = "";
    ContainerRegistryHost: string = "";
    ContainerRegistryUsername: string = "";
    ContainerRegistryPassword: string = "";
    PoolMinimumSize: number = 0;
}

export class ContainerGroupGridRow {
    Name?: string;
    Image?: string;
    Status?: string;
    CpuCount: number = 0;
    MemoryInGB: number = 0;
    IpAddress?: string;
    OsType?: string;
}