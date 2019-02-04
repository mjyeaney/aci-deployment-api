//
// Unit tests for container services
//

import * as dotenv from "dotenv";
import assert = require("assert");
import { ContainerService } from "../container-service";
import { ConfigurationService } from "../config-service";
import { DefaultMatchingStrategy } from "../default-matching-strategy";
import { PendingOperationCache } from "../pending-operation-cache";
import { ConsoleLogger } from "../logging";

dotenv.config();

const consoleLogger = new ConsoleLogger();
const pendingCache = new PendingOperationCache(consoleLogger);

const sut = new ContainerService(consoleLogger,
    new ConfigurationService(),
    new DefaultMatchingStrategy(),
    pendingCache);

describe("Container Services", () => {
    // Does not allow concurrent creation of the same deployment
    // 1. Create sample matching strategy that never finds a match, but always uses the same name

    // If no container tag specified, none is appended to image name

    // Looks for existing deployments to re-use during creation
});