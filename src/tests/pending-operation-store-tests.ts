//
// Unit tests for pending operation cache
//

import * as dotenv from "dotenv";
import { before } from "mocha";
import { IPendingOperationStore } from "../common-types";
import { PendingOperationStore } from "../pending-operation-store";
import { ConsoleLogger } from "../logging";
import * as assert from "assert";

dotenv.config();

describe("Pending Operation Cache", () => {
    let sut: IPendingOperationStore | undefined;
    const logger = new ConsoleLogger();

    before(() => {
        sut = new PendingOperationStore(logger);
    });

    it("Can list operations that have been added", async () => {
        return sut!.AddPendingOperation("test1")
            .then(() => {
                return sut!.GetPendingOperations();
            })
            .then((list) => {
                assert.equal(list.length, 1);
            })
            .then(() => {
                return sut!.RemovePendingOperation("test1");
            });
    });

    it("Cannot add opertaions with duplicate names", async () => {
        let continued: boolean = false;

        return sut!.AddPendingOperation("test1")
            .then(() => {
                return sut!.AddPendingOperation("test1");
            })
            .then(() => {
                continued = true;
            })
            .catch((err) => {
                continued = false;
            })
            .finally(() => {
                sut!.RemovePendingOperation("test1");

                if (continued){
                    assert.fail();
                }
            });
    });

    it("Removing a non-existing task does not cause errors", async () => {
        let failed: boolean = false;

        return sut!.RemovePendingOperation("test1")
            .catch(() => {
                failed = true;
            })
            .finally(() => {
                if (failed) {
                    assert.fail();
                }
            });
    });
});