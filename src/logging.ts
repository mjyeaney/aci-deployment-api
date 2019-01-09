//
// Basic logging implementions
//

import { ILogger } from "./common-types";

export class ConsoleLogger implements ILogger
{
    // Logs a message to the default console.
    public Write(message: string): void {
        const now = new Date().toISOString();
        console.log(`${now} - MSG: ${message}`);
    }
}