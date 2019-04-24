import { PoolStateStore, IPoolStateStore } from "../../pooling/poolStateStore";
import * as Assert from "assert";
import { IContainerService } from "../../commonTypes";
import { ContainerGroupListResult, ContainerGroup } from "azure-arm-containerinstance/lib/models";

let LastUpdateDeploymentTagValue: string;

class MockAciServices implements IContainerService {
    public GetDeployments(): Promise<ContainerGroupListResult> {
        throw new Error("method not implemented");
    };

    GetDeployment(containerGroupName: string): Promise<ContainerGroup>{
        throw new Error("method not implemented");
    }

    CreateNewDeployment(numCpu: number, memoryInGB: number, tag: string | undefined): Promise<ContainerGroup>{
        throw new Error("method not implemented");
    }

    CreateNewDeploymentSync(numCpu: number, memoryInGB: number, tag: string | undefined): Promise<ContainerGroup>{
        throw new Error("method not implemented");
    }

    StopDeployment(containerGroupName: string): Promise<void>{
        throw new Error("method not implemented");
    }

    DeleteDeployment(containerGroupName: string): Promise<void>{
        throw new Error("method not implemented");
    }

    GetFullConatinerDetails(): Promise<ContainerGroup[]>{
        throw new Error("method not implemented");
    }

    

    UpdateDeploymentTag(deploymentResourceId: string, tagName: string, tagValue: string): Promise<void>{
        return new Promise<void>((resolve) => {
            LastUpdateDeploymentTagValue = tagValue;
            resolve();
        });
    }

    GetDeploymentsByTag(tagName: string, tagValue: string): Promise<Array<string>>{
        return new Promise<Array<string>>((resolve) => {
            let fakeResults: Array<string> = [];
            if (tagValue === "Free"){
                fakeResults.push("aci-1-Free");
                fakeResults.push("aci-2-Free");
                fakeResults.push("aci-3-Free");
                fakeResults.push("aci-4-Free");
                fakeResults.push("aci-5-Free");
            } else if (tagValue === "InUse"){
                fakeResults.push("aci-1-InUse");
                fakeResults.push("aci-2-InUse");
                fakeResults.push("aci-3-InUse");
            }
            resolve(fakeResults);
        });
    }
}

const sut: IPoolStateStore = new PoolStateStore(new MockAciServices());

describe("poolStateStore", () => {
    describe("GetFreeMemberIDs", () => {
        it("Should read ACI instances tagged as 'Free'", async () => {
            let members = await sut.GetFreeMemberIDs();
            Assert.equal(members.length, 5);
        });
    });

    describe("GetInUseMemberIDs", () => {
        it("Should read ACI instances tagged as 'InUse'", async () => {
            let members = await sut.GetInUseMemberIDs();
            Assert.equal(members.length, 3);
        })
    });

    describe("UpdateMember", () => {
        it("Should update the specified pool member with the appropriate tag value when not in use", async () => {
            let aMemberId: string = "/some/member-id";
            await sut.UpdateMember(aMemberId, false);
            Assert.equal(LastUpdateDeploymentTagValue, "Free");
        });

        it("Should update the specified pool member with the appropriate tag value when in use", async () => {
            let aMemberId: string = "/some/member-id";
            await sut.UpdateMember(aMemberId, true);
            Assert.equal(LastUpdateDeploymentTagValue, "InUse");
        });
    })
});