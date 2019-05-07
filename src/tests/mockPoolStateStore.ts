import { IPoolStateStore } from "../commonTypes";

export class MockPoolStateStore implements IPoolStateStore {
    private freeMembers: Array<string> = [];
    private inUseMembers: Array<string> = [];

    GetFreeMemberIDs(): Promise<string[]> {
        return new Promise<string[]>((resolve) => {
            resolve(this.freeMembers);
        });
    }
    GetInUseMemberIDs(): Promise<string[]> {
        return new Promise<string[]>((resolve) => {
            resolve(this.inUseMembers);
        });
    }
    UpdateMember(memberId: string, inUse: boolean): Promise<void> {
        return new Promise<void>((resolve) => {
            let tempInUse = new Set(this.inUseMembers);
            let tempFree = new Set(this.freeMembers);
            if (inUse){
                tempFree.delete(memberId);
                tempInUse.add(memberId);
            } else {
                tempInUse.delete(memberId);
                tempFree.add(memberId);
            }
            this.freeMembers = Array.from(tempFree);
            this.inUseMembers = Array.from(tempInUse);
            resolve();
        });
    }
    RemoveMember(memberId: string): Promise<void> {
        return new Promise<void>(resolve => {
            let tempInUse = new Set(this.inUseMembers);
            let tempFree = new Set(this.freeMembers);
            tempFree.delete(memberId);
            tempInUse.delete(memberId);
            this.freeMembers = Array.from(tempFree);
            this.inUseMembers = Array.from(tempInUse);
            resolve();
        });
    }
}