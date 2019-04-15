//
// Implements the state storage for the container instance pool
// This allows tracking of members that are in-use / etc.
//

export interface IPoolStateStore {
    GetMemberIDs(): Promise<Array<string>>;
    GetFreeMemberIDs(): Promise<Array<string>>;
    GetInUseMemberIDs(): Promise<Array<string>>;
    AddMemberID(memberId: string, inUse: boolean): Promise<void>;
}

class PoolMember {
    public ID: string = "";
    public InUse: boolean = false;
}

export class PoolStateStore implements IPoolStateStore {
    private stateStore: Set<PoolMember>;

    constructor() {
        // Simple, in-memory storage for now
        this.stateStore = new Set<PoolMember>();
    }

    public GetMemberIDs(): Promise<Array<string>> {
        return new Promise<string[]>((resolve, reject) => {
            try {
                const members: string[] = [];

                for (let member of this.stateStore){
                    members.push(member.ID);
                }

                resolve(members);
            } catch (err) {
                reject(err);
            }
        });
    }

    public GetFreeMemberIDs(): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            try {
                const freeMembers: string[] = [];

                for (let member of this.stateStore){
                    if (!member.InUse){
                        freeMembers.push(member.ID);
                    }
                }

                resolve(freeMembers);
            } catch (err) {
                reject(err);
            }
        });
    }

    public GetInUseMemberIDs(): Promise<Array<string>>{
        return new Promise<string[]>((resolve, reject) => {
            try {
                const freeMembers: string[] = [];

                for (let member of this.stateStore){
                    if (member.InUse){
                        freeMembers.push(member.ID);
                    }
                }

                resolve(freeMembers);
            } catch (err) {
                reject(err);
            }
        });
    }
    
    public AddMemberID(memberId: string, inUse: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                let newMember = new PoolMember();
                newMember.ID = memberId;
                newMember.InUse = inUse;
                this.stateStore.add(newMember);
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }
}