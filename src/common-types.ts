//
// Common type definitions shared between client and server.
// Mostly used for REST api contracts.
//

import { ContainerGroupListResult, ContainerGroup, Container } from "azure-arm-containerinstance/lib/models";

export interface ILogger {
    Write(message: string): void;
}

export interface IContainerService {
    GetDeployments(): Promise<ContainerGroupListResult>;
    GetDeployment(containerGroupName: string): Promise<ContainerGroup>;
    CreateNewDeployment(numCpu: number, memoryInGB: number, tag: string | undefined): Promise<ContainerGroup>;
    StopDeployment(containerGroupName: string): Promise<void>;
    DeleteDeployment(containerGroupName: string): Promise<void>;
    GetMatchingGroupInfo(numCpu: number, memoryInGB: number, tag: string | undefined): Promise<GroupMatchInformation>;
    GetFullConatinerDetails(): Promise<ContainerGroup[]>;
}

export interface IGroupMatchingStrategy {
    GetNewDeploymentName(): string;
    GetImageName(baseImage: string, tagName: string | undefined): string;
    IsMatch(instance: ContainerGroup,
        numCpu: number,
        memoryInGB: number,
        imageName: string,
        pendingOperations: string[]): boolean;
    IsTerminated(instance: ContainerGroup): boolean;
}

export class GroupMatchInformation {
    Name: string = "";
    Group: ContainerGroup | undefined = undefined;
    WasTerminated: boolean = false;
}

export interface IPendingOperationCache {
    GetPendingOperations(): Promise<string[]>;
    AddPendingOperation(name: string): Promise<void>;
    RemovePendingOperation(name: string): Promise<void>;
    LockStore(numRetries: number): Promise<() => Promise<void>>;
    UnlockStore(): Promise<void>;
}

export interface IReportingService {
    Initialize(): void;
    GetOverviewDetails(): Promise<OverviewDetails>;
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