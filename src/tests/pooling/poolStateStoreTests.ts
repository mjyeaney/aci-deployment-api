import { PoolStateStore } from "../../pooling/poolStateStore";
import { MockLogger } from "../mockLogger";
import * as Assert from "assert";

const logger = new MockLogger();
const sut = new PoolStateStore(logger);

// helper to reset state
const resetState = async () => {
    // list all free and remove
    let freeMembers = await sut.GetFreeMemberIDs();
    freeMembers.forEach(async f => {
        await sut.RemoveMember(f);
    });

    // list all in-use and remove
    let inUseMembers = await sut.GetInUseMemberIDs();
    inUseMembers.forEach(async f => {
        await sut.RemoveMember(f);
    });
};

describe("poolStateStore", () => {
    it("Should read ACI instances tagged as 'Free'", async () => {
        // Add some members
        await sut.UpdateMember("member1", false);
        await sut.UpdateMember("member2", false);
        await sut.UpdateMember("member3", false);
        await sut.UpdateMember("member4", false);
        await sut.UpdateMember("member5", false);
        
        let members = await sut.GetFreeMemberIDs();
        Assert.equal(members.length, 5);

        await resetState();
    });

    it("Should read ACI instances tagged as 'InUse'", async () => {
        // Add some members
        await sut.UpdateMember("member1", true);
        await sut.UpdateMember("member2", false);
        await sut.UpdateMember("member3", true);
        await sut.UpdateMember("member4", false);
        await sut.UpdateMember("member5", true);
        
        let members = await sut.GetInUseMemberIDs();
        Assert.equal(members.length, 3);

        await resetState();
    });

    it("Can remove member from state store", async () => {
        // Add some members
        await sut.UpdateMember("member1", true);
        await sut.UpdateMember("member2", false);
        await sut.UpdateMember("member3", true);
        await sut.UpdateMember("member4", false);
        await sut.UpdateMember("member5", true);

        // Now remove a few
        await sut.RemoveMember("member2");
        await sut.RemoveMember("member4");
        
        let freeMembers = await sut.GetFreeMemberIDs();
        Assert.equal(freeMembers.length, 0);

        let inUseMembers = await sut.GetInUseMemberIDs();
        Assert.equal(inUseMembers.length, 3);

        await resetState();
    });
});