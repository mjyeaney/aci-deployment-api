//
// Tests for default matching strategy methods
//

import * as dotenv from "dotenv";
import { before } from "mocha";
import * as assert from "assert";
import { IGroupMatchingStrategy } from "../common-types";
import { DefaultMatchingStrategy } from "../default-matching-strategy";

dotenv.config();

describe("Default Matching Strategy methods", () => {
    let sut: IGroupMatchingStrategy | undefined;

    before(() => {
        sut = new DefaultMatchingStrategy();
    });

    
});