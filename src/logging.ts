//
// Basic logging implementions
//

export interface ILogger
{
    // Logs a message (async) to an underlying storage provider
    Write(message: string): void;
}

export class ConsoleLogger implements ILogger
{
    // Logs a message to the default console.
    public Write(message: string): void {
        const now = new Date().toISOString();
        console.log(`${now} - MSG: ${message}`);
    }
}