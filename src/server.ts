import { ILogger, ConsoleLogger } from "./logging";
import * as dotenv from "dotenv";

dotenv.config();

const logger: ILogger = new ConsoleLogger();