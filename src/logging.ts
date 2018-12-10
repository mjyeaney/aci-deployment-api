//
// Basic logging implemention. 
//

export interface ILogger
{
    LogMessage(message: string): Promise<void>;
}

export class ConsoleLogger implements ILogger
{
    public async LogMessage(message: string): Promise<void> {
        return new Promise<void>((resolve) => {
            const now = new Date().toISOString();
            console.log(`${now} - MSG: ${message}`);
            resolve();
        })
    }
}