//
// Implements redering of the deployments grid for our UI
//
import { ContainerGroupGridRow } from "../commonTypes";

export class DeploymentsGrid {
    public Render(data: ContainerGroupGridRow[]) {
        return `
        <table>
            <colgroup>
                <col width="100px" />
                <col width="20%" />
                <col width="*" />
                <col width="250px" />
                <col width="100px" />
                <col width="100px" />
            </colgroup>
            <tr>
                <th>In Use</th>
                <th>Container Group Name</th>
                <th>IP Address</th>
                <th>Image Name</th>
                <th>CPU Count</th>
                <th>Memory (GB)</th>
            </tr>
            ${this.renderGridRows(data)}
        </table>
        `;
    }

    private renderGridRows(data: ContainerGroupGridRow[]){
        const markup = data.map((item: ContainerGroupGridRow) => {
            return `
            <tr>
                <td class="centered">${this.getInUseMarkup(item.InUse, item.Unknown)}</td>
                <td>${item.Name}</td>
                <td>${item.IpAddress ? item.IpAddress : "Unassigned"}</td>
                <td>${item.Image}</td>
                <td>${item.CpuCount}</td>
                <td>${item.MemoryInGB}</td>
            </tr>
            `;
        });
        return markup.join('');
    }

    private getInUseMarkup(inUse: boolean | undefined, unknown: boolean | undefined): string {
        if (unknown) {
            return "<i class=\"fas fa-exclamation-triangle\" title=\"Status unknown\"></i>";
        } else {
            if (inUse) {
                return "<i class=\"fas fa-check\" title=\"Deployment in-use\"></i>";
            } else {
                return "";
            }
        }
    }
}