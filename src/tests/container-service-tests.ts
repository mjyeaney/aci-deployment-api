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

const sut = new ContainerService(consoleLogger,
    new ConfigurationService(),
    new DefaultMatchingStrategy(),
    new PendingOperationCache(consoleLogger));

describe("Container Services", () => {
    it("Initial state has zero deployments", async () => {
        return sut.GetDeployments()
            .then((list) => {
                assert.equal(list.length, 0);
            });
    });

    it("Intial call to get full details returns zero results", async () => {
        return sut.GetFullConatinerDetails()
            .then((results) => {
                assert.equal(results.length, 0);
            });
    });

    it("Get details on non-existing deployment fails", async () => {
        return sut.GetDeployment("fred")
            .then((deployment) => {
                assert.fail();
            })
            .catch((err) => {
                assert.ok(err);
            });
    });

    it("Deleting a non-existing deployment fails", async () => {
        return sut.DeleteDeployment("fred")
            .then(() => {
                assert.fail();
            })
            .catch((err) => {
                assert.ok(err);
            });
    });

    it("Stopping a non-existing deployment fails", async () => {
        return sut.StopDeployment("fred")
            .then(() => {
                assert.fail();
            })
            .catch((err) => {
                assert.ok(err);
            });
    });
});