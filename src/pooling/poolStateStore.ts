//
// Implements the state storage for the container instance pool
// This allows tracking of members that are in-use / etc.
//

import { IPoolStateStore, ILogger } from "../commonTypes";
import * as lockfile from "proper-lockfile";
import * as io from "fs";

export class PoolStateStore implements IPoolStateStore {
    private readonly SYNC_ROOT_FILE_PATH: string = "./data/poolState.lock";
    private readonly INUSE_FILE_PATH: string = "./data/psiu.json";
    private readonly FREE_FILE_PATH: string = "./data/psf.json";
    private readonly logger: ILogger;

    private inUse: Set<string> = new Set();
    private free: Set<string> = new Set();

    constructor(logger: ILogger){
        this.logger = logger;
    }    

    public GetFreeMemberIDs(): Promise<string[]> {
        return new Promise<string[]>(async (resolve, reject) => {
            try {
                this.readSync();
                let deploymentNames = [...this.free]
                resolve(deploymentNames);
            } catch (err) {
                reject(err);
            }
        });
    }

    public GetInUseMemberIDs(): Promise<Array<string>>{
        return new Promise<string[]>(async (resolve, reject) => {
            try {
                this.readSync();
                let deploymentNames = [...this.inUse];
                resolve(deploymentNames);
            } catch (err) {
                reject(err);
            }
        });
    }

    public RemoveMember(memberId: string): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            let acquiredLock: boolean = false;
            this.logger.Write(`Removing state for member: ${memberId}...`);

            try {
                await this.LockStore();
                acquiredLock = true;

                this.readSync();
                this.inUse.delete(memberId);
                this.free.delete(memberId);
                this.flushSync();

                resolve();
            } catch (err) {
                reject(err);
            } finally {
                if (acquiredLock){
                    await this.UnlockStore();
                }
            }
        });
    }
    
    public UpdateMember(memberId: string, inUse: boolean): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            let acquiredLock: boolean = false;
            this.logger.Write(`Updating pool state for member: ${memberId}...`);

            try {
                await this.LockStore();
                acquiredLock = true;

                this.readSync();
                if (inUse){
                    this.inUse.add(memberId);
                    this.free.delete(memberId);
                } else {
                    this.free.add(memberId);
                    this.inUse.delete(memberId);
                }
                this.flushSync();

                resolve();
            } catch (err) {
                reject(err);
            } finally {
                if (acquiredLock){
                    await this.UnlockStore();
                }
            }
        });
    }

    public async LockStore(): Promise<() => Promise<void>> {
        return lockfile.lock(this.SYNC_ROOT_FILE_PATH, { retries: 5 })
    }

    public async UnlockStore(): Promise<void> {
        return lockfile.unlock(this.SYNC_ROOT_FILE_PATH);
    }

    private flushSync() : void {
        io.writeFileSync(this.INUSE_FILE_PATH, JSON.stringify([...this.inUse]));
        io.writeFileSync(this.FREE_FILE_PATH, JSON.stringify([...this.free]));
    }

    private readSync() {
        if (io.existsSync(this.INUSE_FILE_PATH)){
            // Note the "rs+" flag to ask the OS to skip local cache
            const readBuffer = io.readFileSync(this.INUSE_FILE_PATH, { flag: "rs+" });
            this.inUse = new Set(JSON.parse(readBuffer.toString()));
        }

        if (io.existsSync(this.FREE_FILE_PATH)){
            // Note the "rs+" flag to ask the OS to skip local cache
            const readBuffer = io.readFileSync(this.FREE_FILE_PATH, { flag: "rs+" });
            this.free = new Set(JSON.parse(readBuffer.toString()));
        }
    }
}