//
// Implements a cache of active deployment actions on top of a shared storage subsystem
// 
// This is designed to write a file to and underlying replicated storage location.
//

import { ILogger } from "./common-types";
import * as io from "fs";

export interface IPendingDeploymentCache {
    GetCurrentDeploymentNames(): Promise<string[]>;
    AddPendingDeploymentName(name: string): Promise<void>;
    RemoveDeploymentName(name: string): Promise<void>;
}

export class PendingDeploymentCache implements IPendingDeploymentCache {
    private readonly FILE_PATH: string = "./data/pending.cache";
    private tempStorage: string[];
    private readonly logger: ILogger;

    constructor(logger: ILogger){
        this.tempStorage = [];
        this.logger = logger;
    }

    public async GetCurrentDeploymentNames(): Promise<string[]> {
        this.logger.Write(`Getting current pending deployments...`);
        return new Promise<string[]>((resolve, reject) => {
            this.readSync();
            resolve(this.tempStorage);
        });
    }

    public async AddPendingDeploymentName(name: string): Promise<void> {
        this.logger.Write(`Adding pending deployment named ${name}...`);
        return new Promise<void>((resolve, reject) => {
            this.tempStorage.push(name);
            this.flushSync();
            resolve();
        });
    }
    
    public async RemoveDeploymentName(name: string): Promise<void> {
        this.logger.Write(`Removing pending deployment named ${name}...`);
        return new Promise<void>((resolve, reject) => {
            const index = this.tempStorage.indexOf(name);
            this.tempStorage.splice(index, 1);
            this.flushSync();
            resolve();
        });
    }

    private flushSync() : void {
        io.writeFileSync(this.FILE_PATH, JSON.stringify(this.tempStorage));
    }

    private readSync(): void {
    if (!io.existsSync(this.FILE_PATH)){
            this.tempStorage = [];
            return;
        }
        
        const readBuffer = io.readFileSync(this.FILE_PATH);
        this.tempStorage = JSON.parse(readBuffer.toString());
    }
}