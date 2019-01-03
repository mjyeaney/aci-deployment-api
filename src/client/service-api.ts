//
// Contains methods used to call REST endpoints aainst our server
//
// NOTE: The UI manipulatino needs fatored out of here..just copy/pasta'd for now.
//

import { OverviewDetails } from "../common-types";

export interface IServiceApi {
    LoadSummaryData(): Promise<OverviewDetails>;
    LoadInstancesData(): Promise<any>;
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

    public LoadInstancesData() {
        return new Promise<any>((resolve, reject) => {
            // TODO:
            resolve();
        });
    }
}