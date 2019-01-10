//
// Contains methods used to call REST endpoints aainst our server
//
// NOTE: The UI manipulatino needs fatored out of here..just copy/pasta'd for now.
//

import { OverviewDetails, ConfigurationDetails, ContainerGroupGridRow } from "../common-types";

export interface IServiceApi {
    LoadSummaryData(): Promise<OverviewDetails>;
    LoadConfigurationData(): Promise<ConfigurationDetails>;
    LoadInstancesData(): Promise<ContainerGroupGridRow[]>;
}

export class ServiceApi implements IServiceApi {
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
            xhr.onload = () => {
                if (xhr.status === 200){
                    const payload: any[] = JSON.parse(xhr.responseText);
                    const data: ContainerGroupGridRow[] = [];
                    payload.map((item: any) => {
                        let row = new ContainerGroupGridRow();
                        row.Name = item.name!;
                        row.CpuCount = item.containers![0].resources!.requests!.cpu!;
                        row.MemoryInGB = item.containers![0].resources!.requests!.memoryInGB;
                        row.IpAddress = item.ipAddress!.ip!;
                        row.OsType = item.osType!;
                        row.Status = "Unknown";
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
}