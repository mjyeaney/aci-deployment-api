//
// Implements the state storage for the container instance pool
// This allows tracking of members that are in-use / etc.
//

export interface IPoolStateStore {
    GetMembers(): Promise<Array<PoolMember>>;
    GetFreeMemberIDs(): Promise<Array<string>>;
    GetInUseMemberIDs(): Promise<Array<string>>;
    AddMember(memberId: string, inUse: boolean): Promise<void>;
    UpdateMember(memberId: string, inUse: boolean): Promise<void>;
}

export class PoolMember {
    public ID: string = "";
    public InUse: boolean = false;
}

export class PoolStateStore implements IPoolStateStore {
    private stateStore: Set<PoolMember>;

    constructor() {
        // Simple, in-memory storage for now
        this.stateStore = new Set<PoolMember>();
    }

    public GetMembers(): Promise<Array<PoolMember>> {
        return new Promise<Array<PoolMember>>((resolve, reject) => {
            try {
                const members: Array<PoolMember> = [];

                for (let member of this.stateStore){
                    members.push(member);
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
    
    public AddMember(memberId: string, inUse: boolean): Promise<void> {
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

    public UpdateMember(memberId: string, inUse: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                for (let member of this.stateStore){
                    if (member.ID === memberId){
                        member.InUse = inUse;
                    }
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }
}