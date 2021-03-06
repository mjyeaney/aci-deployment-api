//
// Common type definitions shared between client and server.
// Mostly used for REST api contracts.
//

import { ContainerGroupListResult, ContainerGroup } from "azure-arm-containerinstance/lib/models";

export interface ILogger {
    Write(message: string): void;
}

export interface IContainerInstancePool {
    PoolInitialized: boolean;
    Initialize(): Promise<void>;
    GetPooledContainerInstance(numCpu: number, memoryInGB: number, tag: string): Promise<ContainerGroup>;
    RemovePooledContainerInstance(deploymentId: string): Promise<void>;
    ReleasePooledConatainerInstance(deploymentId: string): Promise<void>;
    RemoveExcessFreeMembers(): Promise<void>;
    EnsureMinFreeMembers(): Promise<void>;
}

export interface IPoolStateStore {
    GetFreeMemberIDs(): Promise<Array<string>>;
    GetInUseMemberIDs(): Promise<Array<string>>;
    RemoveMember(memberId: string): Promise<void>;
    UpdateMember(memberId: string, inUse: boolean): Promise<void>;
}

export interface IContainerService {
    GetDeployments(): Promise<ContainerGroupListResult>;
    GetDeployment(containerGroupName: string): Promise<ContainerGroup>;
    CreateNewDeployment(numCpu: number, memoryInGB: number, imageTag: string | undefined): Promise<ContainerGroup>;
    BeginCreateNewDeployment(numCpu: number, memoryInGB: number, imageTag: string | undefined): Promise<ContainerGroup>;
    StopDeployment(containerGroupName: string): Promise<void>;
    DeleteDeployment(containerGroupName: string): Promise<void>;
    GetFullConatinerDetails(): Promise<ContainerGroup[]>;
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
    Name: string;
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
    PoolCpuCount: number = 0;
    PoolMemoryInGB: number = 0;
    PoolContainerImageTag: string = "";
}

export class ConfigurationWithStatus extends ConfigurationDetails {
    CurrentStatus: "Initializing" | "Ready" | "Failed" | undefined;

    constructor(base: ConfigurationDetails) {
        super();
        this.TenantId = base.TenantId;
        this.SubscriptionId = base.SubscriptionId;
        this.ClientId = base.ClientId;
        this.ClientSecret = base.ClientSecret;
        this.Region = base.Region;
        this.ResourceGroup = base.ResourceGroup;
        this.ContainerImage = base.ContainerImage;
        this.ContainerPort = base.ContainerPort;
        this.ContainerOs = base.ContainerOs;
        this.ReportingRefreshInterval = base.ReportingRefreshInterval;
        this.ContainerRegistryHost = base.ContainerRegistryHost;
        this.ContainerRegistryUsername = base.ContainerRegistryUsername;
        this.ContainerRegistryPassword = base.ContainerRegistryPassword;
        this.PoolMinimumSize = base.PoolMinimumSize;
        this.PoolCpuCount = base.PoolCpuCount;
        this.PoolMemoryInGB = base.PoolMemoryInGB;
        this.PoolContainerImageTag = base.PoolContainerImageTag;
    }
}

export class ContainerGroupGridRow {
    Name?: string;
    Image?: string;
    CpuCount: number = 0;
    MemoryInGB: number = 0;
    IpAddress?: string;
    OsType?: string;
    InUse?: boolean;
    Unknown?: boolean;
}

export class PoolStatus {
    Free: Array<string> = [];
    InUse: Array<string> = [];
}