//
// Tests for default matching strategy methods
//

import * as dotenv from "dotenv";
import { before } from "mocha";
import * as assert from "assert";
import { ContainerGroup } from "azure-arm-containerinstance/lib/models";
import { IGroupMatchingStrategy } from "../common-types";
import { DefaultMatchingStrategy } from "../default-matching-strategy";

dotenv.config();

describe("Default Matching Strategy methods", () => {
    let sut: IGroupMatchingStrategy | undefined;

    before(() => {
        sut = new DefaultMatchingStrategy();
    });

    it("Builds image name with tag if specified", () => {
        let imageName = sut!.GetImageName("foo", "bar");
        assert.equal(imageName, "foo:bar");
    });

    it("Does not append tag specifier if none specified", () => {
        let imageName = sut!.GetImageName("foo", undefined);
        assert.equal(imageName, "foo");
    });

    it("Determines terminated state based on ContainerGroup state", () => {
        let fakeGroup = {
            identity: undefined,
            provisioningState: "sample",
            containers: [],
            imageRegistryCredentials: undefined,
            restartPolicy: "Never",
            ipAddress: undefined,
            osType: "windows",
            volumes: undefined,
            instanceView: {
                events: [],
                state: "terminated"
            },
            diagnostics: undefined,
            networkProfile: undefined,
            dnsConfig: undefined
        };

        let isTerminated: boolean = sut!.IsTerminated(fakeGroup);
        assert.equal(isTerminated, true);

        fakeGroup.instanceView.state = "no so much";
        isTerminated = sut!.IsTerminated(fakeGroup);
        assert.equal(isTerminated, false);
    });

    it("Determines terminated state regardless of state casing", () => {
        let fakeGroup = {
            identity: undefined,
            provisioningState: "sample",
            containers: [],
            imageRegistryCredentials: undefined,
            restartPolicy: "Never",
            ipAddress: undefined,
            osType: "windows",
            volumes: undefined,
            instanceView: {
                events: [],
                state: "TeRmInAtEd"
            },
            diagnostics: undefined,
            networkProfile: undefined,
            dnsConfig: undefined
        };

        let isTerminated: boolean = sut!.IsTerminated(fakeGroup);
        assert.equal(isTerminated, true);

        fakeGroup.instanceView.state = "TERMINATED";
        isTerminated = sut!.IsTerminated(fakeGroup);
        assert.equal(isTerminated, true);

        fakeGroup.instanceView.state = "tErMiNaTeD";
        isTerminated = sut!.IsTerminated(fakeGroup);
        assert.equal(isTerminated, true);
    });
});