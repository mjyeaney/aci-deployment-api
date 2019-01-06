//
// Implements redering of the deployments grid for our UI
//
import { ContainerGroupGridRow } from "../common-types";

export class DeploymentsGrid {
    public Render(data: ContainerGroupGridRow[]) {
        return `
        <table>
            <colgroup>
                <col width="30%" />
                <col width="30%" />
                <col width="100px" />
                <col width="100px" />
                <col width="100px" />
            </colgroup>
            <tr>
                <th>Container Group Name</th>
                <th>IP Address</th>
                <th>CPU Count</th>
                <th>Memory in GB</th>
                <th>Status</th>
            </tr>
            ${this.renderGridRows(data)}
        </table>
        `;
    }

    private renderGridRows(data: ContainerGroupGridRow[]){
        const markup = data.map((item: ContainerGroupGridRow) => {
            return `
            <tr>
                <td>${item.Name}</td>
                <td>${item.IpAddress}</td>
                <td>${item.CpuCount}</td>
                <td>${item.MemoryInGB}</td>
                <td>${item.Status}</td>
            </tr>
            `;
        });
        return markup.join('');
    }
}