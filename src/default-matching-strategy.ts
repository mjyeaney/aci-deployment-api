//
// Default startegy for checking to see if a specific contatiner group
// matches the specified resource description
//

import { IGroupMatchingStrategy } from "./common-types";
import { ContainerGroup } from "azure-arm-containerinstance/lib/models";

export class DefaultMatchingStrategy implements IGroupMatchingStrategy {

    public IsMatch(instance: ContainerGroup,
        numCpu: number,
        memoryInGB: number,
        imageName: string,
        pendingDeployments: string[]): boolean {

        if ((instance.containers[0].image === imageName) &&
            (instance.containers[0].resources.requests.cpu === numCpu) &&
            (instance.containers[0].resources.requests.memoryInGB === memoryInGB) &&
            (pendingDeployments.indexOf(instance.name!) === -1)) {

            // If the above metrics matched, now check status:
            // Status can either be "Stopped" or "Terminated"
            if (instance.instanceView!.state){
                if ((instance.instanceView!.state!.toLowerCase() === "stopped") ||
                    (instance.instanceView!.state!.toLowerCase() === "terminated")) {

                    // Match!!!
                    return true;
                }
            }
        }

        return false;
    }
}
