//
// Default startegy for checking to see if a specific contatiner group
// matches the specified resource description
//

import { IGroupMatchingStrategy, ContainerGroupStatus } from "./common-types";
import { ContainerGroup } from "azure-arm-containerinstance/lib/models";
import uuid = require("uuid");

export class DefaultMatchingStrategy implements IGroupMatchingStrategy {

    public GetNewDeploymentName(): string {
        const uniq = uuid().substr(-12);
        return `aci-inst-${uniq}`;
    }

    public GetImageName(baseImage: string, tagName: string | undefined): string {
        let imageName = baseImage;
        if (tagName) {
            imageName = `${baseImage}:${tagName}`;
        }
        return imageName;
    }

    public IsMatch(instance: ContainerGroup,
        numCpu: number,
        memoryInGB: number,
        imageName: string,
        pendingOperations: string[]): boolean {

        // Current business logic requires same image, same CPU count, and same memory.
        // The, only the status of "Stopped" (managmenet API peration) or 
        // "terminated" (container exit) are considered.
        if ((instance.containers[0].image === imageName) &&
            (instance.containers[0].resources.requests.cpu === numCpu) &&
            (instance.containers[0].resources.requests.memoryInGB === memoryInGB) &&
            (pendingOperations.indexOf(instance.name!) === -1)) {

            // If the above metrics matched, now check status:
            // Status can either be "Stopped" or "Terminated"
            if (instance.instanceView!.state){
                if ((instance.instanceView!.state!.toLowerCase() === ContainerGroupStatus.Stopped) ||
                    (instance.instanceView!.state!.toLowerCase() === ContainerGroupStatus.Terminated)) {

                    // Match!!!
                    return true;
                }
            }
        }

        // Default case - no match found
        return false;
    }

    public IsTerminated(instance: ContainerGroup): boolean {
        if ((instance.instanceView!.state) &&
            (instance.instanceView!.state!.toLowerCase() === ContainerGroupStatus.Terminated)) {
            return true;
        }
        return false;
    }
}
