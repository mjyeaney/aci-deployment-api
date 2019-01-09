import { ILogger } from "./common-types";

//
// Implements a cache of active deployment actions on top of a shared storage subsystem
// 
// This is designed to write a file to and underlying replicated storage location.
//


export interface IPendingDeploymentCache {
    GetCurrentDeploymentNames(): Promise<string[]>;
    AddPendingDeploymentName(name: string): Promise<void>;
    RemoveDeploymentName(name: string): Promise<void>;
}

export class PendingDeploymentCache implements IPendingDeploymentCache {
    private tempStorage: string[];

    private readonly logger: ILogger;

    constructor(logger: ILogger){
        this.tempStorage = [];
        this.logger = logger;
    }

    public GetCurrentDeploymentNames(): Promise<string[]> {
        this.logger.Write(`Getting current pending deployments...`);
        return new Promise<string[]>((resolve, reject) => {
            resolve(this.tempStorage);
        });
    }

    public AddPendingDeploymentName(name: string): Promise<void> {
        this.logger.Write(`Adding pending deployment named ${name}...`);
        return new Promise<void>((resolve, reject) => {
            this.tempStorage.push(name);
            resolve();
        });
    }
    
    public RemoveDeploymentName(name: string): Promise<void> {
        this.logger.Write(`Removing pending deployment named ${name}...`);
        return new Promise<void>((resolve, reject) => {
            const index = this.tempStorage.indexOf(name);
            this.tempStorage.splice(index, 1);
            resolve();
        });
    }
}