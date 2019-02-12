//
// Tests for default matching strategy methods
//

import * as dotenv from "dotenv";
import { before } from "mocha";
import * as assert from "assert";
import { IGroupStrategy } from "../common-types";
import { DefaultGroupStrategy } from "../default-group-strategy";

dotenv.config();

describe("Default Matching Strategy methods", () => {
    let sut: IGroupStrategy | undefined;

    before(() => {
        sut = new DefaultGroupStrategy();
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

    it("Matches existing deployments that are stopped with the same cpu/memory", () => {
        let fakeGroup = {
            identity: undefined,
            provisioningState: "sample",
            containers: [{
                name: "default",
                image: "microsoft/aci-helloworld",
                resources: {
                    requests: {
                        cpu: 2,
                        memoryInGB: 2
                    }
                }
            }],
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

        let isMatch: boolean = sut!.IsMatch(fakeGroup, 2, 2, "microsoft/aci-helloworld", []);
        assert.equal(isMatch, true);

        fakeGroup.instanceView.state = "Stopped";
        isMatch = sut!.IsMatch(fakeGroup, 2, 2, "microsoft/aci-helloworld", []);
        assert.equal(isMatch, true);

        fakeGroup.instanceView.state = "Stopped";
        isMatch = sut!.IsMatch(fakeGroup, 2, 4, "microsoft/aci-helloworld", []);
        assert.equal(isMatch, false);

        fakeGroup.instanceView.state = "Stopped";
        isMatch = sut!.IsMatch(fakeGroup, 4, 2, "microsoft/aci-helloworld", []);
        assert.equal(isMatch, false);
    });

    it("Matches existing deployments with the exact same container image name", () => {
        let fakeGroup = {
            identity: undefined,
            provisioningState: "sample",
            containers: [{
                name: "default",
                image: "microsoft/aci-helloworld",
                resources: {
                    requests: {
                        cpu: 2,
                        memoryInGB: 2
                    }
                }
            }],
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

        let isMatch: boolean = sut!.IsMatch(fakeGroup, 2, 2, "microsoft/aci-helloworld", []);
        assert.equal(isMatch, true);

        fakeGroup.containers![0].image = "microsoft/aci-helloworld:latest";
        isMatch = sut!.IsMatch(fakeGroup, 2, 2, "microsoft/aci-helloworld", []);
        assert.equal(isMatch, false);

        fakeGroup.containers![0].image = "microsoft/aci-helloworld:latest";
        isMatch = sut!.IsMatch(fakeGroup, 2, 2, "microsoft/aci-helloworld:latest", []);
        assert.equal(isMatch, true);
    });

    it("Does not match a deployment that is marked as in-progress", () => {
        let fakeGroup = {
            name: "test-deployment",
            identity: undefined,
            provisioningState: "sample",
            containers: [{
                name: "default",
                image: "microsoft/aci-helloworld",
                resources: {
                    requests: {
                        cpu: 2,
                        memoryInGB: 2
                    }
                }
            }],
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

        let isMatch: boolean = sut!.IsMatch(fakeGroup, 2, 2, "microsoft/aci-helloworld", ["test-deployment"]);
        assert.equal(isMatch, false);
    });
});