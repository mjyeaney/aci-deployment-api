//
// Basic logging implementions
//

export interface ILogger
{
    // Logs a message (async) to an underlying storage provider
    LogMessage(message: string): Promise<void>;
}

export class ConsoleLogger implements ILogger
{
    // Logs a message to the default console.
    public async LogMessage(message: string): Promise<void> {
        return new Promise<void>((resolve) => {
            const now = new Date().toISOString();
            console.log(`${now} - MSG: ${message}`);
            resolve();
        })
    }
}