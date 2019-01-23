//
// Common type definitions shared between client and server.
// Mostly used for REST api contracts.
//

import { ContainerGroupListResult, ContainerGroup } from "azure-arm-containerinstance/lib/models";

export interface ILogger {
    /**
     * Writes the provided message to the underlying log stream provider.
     */
    Write(message: string): void;
}

export interface IContainerService {
    /**
     * Gets a list of currently deployed ACI deployments.
     */
    GetDeployments(): Promise<ContainerGroupListResult>;

    /**
     * Gets a single ACI deployment instance.
     */
    GetDeployment(containerGroupName: string): Promise<ContainerGroup>;

    /**
     * Creates a new ACI deployment using the provided parameters.
     */
    CreateNewDeployment(numCpu: number, memoryInGB: number, tag: string | undefined): Promise<ContainerGroup>;

    /**
     * Stops the specified deployment (but does not delete).
     */
    StopDeployment(containerGroupName: string): Promise<void>;

    /**
     * Deletes the specified ACI deployment resource.
     */
    DeleteDeployment(containerGroupName: string): Promise<void>;

    /**
     * Primarily a test method, but returns information for any instances that match the provided deployment. 
     * Note this mutates the pending deployment cache.
     */
    GetMatchingGroupInfo(numCpu: number, memoryInGB: number, tag: string | undefined): Promise<GroupMatchInformation>;

    /**
     * Returns full instance-level details about all deployed instances. Note this is an O(n^2) call.
     */
    GetFullConatinerDetails(): Promise<ContainerGroup[]>;
}

export interface IGroupMatchingStrategy {
    /**
     * Tests the specified instance to see if it matches the required params. If true, the ContainerGroup 
     * can be re-used.
     */
    IsMatch(instance: ContainerGroup,
        numCpu: number,
        memoryInGB: number,
        imageName: string,
        pendingOperations: string[]): boolean;
}

export class GroupMatchInformation {
    /**
     * The name of the container group.
     */
    Name: string = "";

    /**
     * The ContatinerGroup that matched, or undefined if none matched.
     */
    Group: ContainerGroup | undefined = undefined;

    /**
     * True if the matching instances was terminated (vs. stopped). Has impacts on how 
     * an instance is re-started.
     */
    WasTerminated: boolean = false;
}

export interface IPendingOperationCache {
    /**
     * Returns the current pending deployments.
     */
    GetPendingOperations(): Promise<string[]>;

    /**
     * Adds a deployment to the list of pending.
     */
    AddPendingOperation(name: string): Promise<void>;

    /**
     * Removes a deployment from the current pending list.
     */
    RemovePendingOperation(name: string): Promise<void>;
}

export interface IReportingService {
    /**
     * Initializes and starts the reporting jobs.
     */
    Initialize(): void;

    /**
     * Returns overview details for current environment.
     */
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