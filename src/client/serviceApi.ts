//
// Contains methods used to call REST endpoints aainst our server
//
// NOTE: The UI manipulatino needs fatored out of here..just copy/pasta'd for now.
//

import { OverviewDetails, ConfigurationDetails, ContainerGroupGridRow, AuthInfo, PoolStatus } from "../commonTypes";
import { ContainerGroup } from "azure-arm-containerinstance/lib/models";

export interface IServiceApi {
    LoadAuthInfo(): Promise<AuthInfo>;
    LoadSummaryData(): Promise<OverviewDetails>;
    LoadConfigurationData(): Promise<ConfigurationDetails>;
    LoadInstancesData(): Promise<ContainerGroupGridRow[]>;
}

export class ServiceApi implements IServiceApi {
    public LoadAuthInfo() {
        return new Promise<AuthInfo>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", "/api/authinfo");
            xhr.onload = () => {
                if (xhr.status === 200) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(xhr.statusText);
                }
            };
            xhr.send();
        });
    }

    public LoadSummaryData() {
        return new Promise<OverviewDetails>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", "/api/overviewSummary");
            xhr.onload = () => {
                if (xhr.status === 200) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(xhr.statusText);
                }
            };
            xhr.send();
        });
    }

    public LoadConfigurationData() {
        return new Promise<ConfigurationDetails>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", "/api/configuration");
            xhr.onload = () => {
                if (xhr.status === 200){
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(xhr.statusText);
                }
            };
            xhr.send();
        });
    }

    public LoadInstancesData() {
        return new Promise<ContainerGroupGridRow[]>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", "/api/deployments");
            xhr.onload = async () => {
                if (xhr.status === 200){
                    const payload: any[] = JSON.parse(xhr.responseText);
                    const data: ContainerGroupGridRow[] = [];

                    // Load pool status data
                    const poolStatus = await this.LoadPoolStatusData();
                    const freeList = new Set(poolStatus.Free);
                    const inUseList =new Set(poolStatus.InUse);

                    // unwrap container group data
                    payload.map((item: ContainerGroup) => {
                        let row = new ContainerGroupGridRow();
                        row.Name = item.name!;
                        row.Image = item.containers![0].image;
                        row.CpuCount = item.containers![0].resources!.requests!.cpu!;
                        row.MemoryInGB = item.containers![0].resources!.requests!.memoryInGB;
                        row.IpAddress = item.ipAddress!.ip!;
                        row.OsType = item.osType!;
                        row.Status = "Unknown";

                        // Leverage tags for pool status
                        if (freeList.has(item.id!)){
                            row.InUse = false;
                        }

                        if (inUseList.has(item.id!)){
                            row.InUse = true;
                        }

                        data.push(row);
                    });
                    resolve(data);
                } else {
                    reject(xhr.statusText);
                }
            };
            xhr.send();
        });
    }

    public LoadPoolStatusData() {
        return new Promise<PoolStatus>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", "/api/poolStatus");
            xhr.onload = () => {
                if (xhr.status === 200){
                    const payload: PoolStatus = JSON.parse(xhr.responseText);
                    const data: PoolStatus = new PoolStatus();
                    data.Free = payload.Free;
                    data.InUse = payload.InUse;
                    resolve(data);
                } else {
                    reject(xhr.statusText);
                }
            };
            xhr.send();
        });
    }
}