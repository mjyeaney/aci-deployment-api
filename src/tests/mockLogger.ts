import { ILogger } from "../commonTypes";

export class MockLogger implements ILogger {
    Write(message: string): void { console.log(message); }
}