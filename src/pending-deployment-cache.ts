//
// Implements a cache of active deployment actions on top of a shared storage subsystem
// 
// This is designed to write a file to and underlying replicated storage location.
//

import { ILogger } from "./common-types";
import * as lockfile from "proper-lockfile";
import * as io from "fs";

export interface IPendingDeploymentCache {
    GetCurrentDeploymentNames(): Promise<string[]>;
    AddPendingDeploymentName(name: string): Promise<void>;
    RemoveDeploymentName(name: string): Promise<void>;
}

export class PendingDeploymentCache implements IPendingDeploymentCache {
    private readonly SYNC_ROOT_FILE_PATH: string = "./data/pending.lock";
    private readonly FILE_PATH: string = "./data/pending.cache";
    private readonly logger: ILogger;

    constructor(logger: ILogger){
        this.logger = logger;
    }

    public async GetCurrentDeploymentNames(): Promise<string[]> {
        this.logger.Write(`Getting current pending deployments...`);
        return new Promise<string[]>((resolve, reject) => {
            resolve(this.readSync());
        });
    }

    public async AddPendingDeploymentName(name: string): Promise<void> {
        this.logger.Write(`Adding pending deployment named ${name}...`);
        return new Promise<void>(async (resolve, reject) => {
            await lockfile.lock(this.SYNC_ROOT_FILE_PATH, { retries: 5});
            const names = this.readSync();
            names.push(name);
            this.flushSync(names);
            lockfile.unlockSync(this.SYNC_ROOT_FILE_PATH);
            resolve();
        });
    }
    
    public async RemoveDeploymentName(name: string): Promise<void> {
        this.logger.Write(`Removing pending deployment named ${name}...`);
        return new Promise<void>(async (resolve, reject) => {
            await lockfile.lock(this.SYNC_ROOT_FILE_PATH, { retries: 5});
            const names = this.readSync();
            const index = names.indexOf(name);
            names.splice(index, 1);
            this.flushSync(names);
            lockfile.unlockSync(this.SYNC_ROOT_FILE_PATH);
            resolve();
        });
    }

    private flushSync(names: string[]) : void {
        io.writeFileSync(this.FILE_PATH, JSON.stringify(names));
    }

    private readSync(): string[] {
    if (!io.existsSync(this.FILE_PATH)){
            return [];
        }
        
        const readBuffer = io.readFileSync(this.FILE_PATH);
        return JSON.parse(readBuffer.toString());
    }
}