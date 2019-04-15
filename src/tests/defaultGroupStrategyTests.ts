//
// Tests for default matching strategy methods
//

import * as dotenv from "dotenv";
import { before } from "mocha";
import * as assert from "assert";
import { IGroupStrategy, GroupMatchInformation } from "../commonTypes";
import { DefaultGroupStrategy } from "../defaultGroupStrategy";
import { ConsoleLogger } from "../logging";
import { ContainerGroup } from "azure-arm-containerinstance/lib/models";
import { resolve } from "path";

dotenv.config();

describe("Default Matching Strategy methods", () => {
    let sut: IGroupStrategy | undefined;
    const logger = new ConsoleLogger();

    before(() => {
        sut = new DefaultGroupStrategy(logger);
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

    it("Creates a new instance if no match is found", () => {
        let createCalled = false;
        let startCalled = false;
        let restartCalled = false;
        let matchInfo = new GroupMatchInformation();

        matchInfo.Group = undefined;
        matchInfo.Name = "foo";
        matchInfo.WasTerminated = false;

        sut!.InvokeCreationDelegate(matchInfo, 
            () => {
                return new Promise<ContainerGroup>((resolve) => {
                    createCalled = true;
                    resolve();            
                })
            },
            () => {
                return new Promise<void>((resolve) => {
                    startCalled = true;
                    resolve();
                });
            },
            () => {
                return new Promise<void>((resolve) => {
                    restartCalled = true;
                    resolve();
                });
            }
        );

        assert.equal(createCalled, true);
        assert.equal(startCalled, false);
        assert.equal(restartCalled, false);
    });

    it("Starts an existing group if a match is found that wasn't termintated", () => {
        let createCalled = false;
        let startCalled = false;
        let restartCalled = false;
        let matchInfo = new GroupMatchInformation();

        matchInfo.Group = {} as ContainerGroup;
        matchInfo.Name = "foo";
        matchInfo.WasTerminated = false;

        sut!.InvokeCreationDelegate(matchInfo, 
            () => {
                return new Promise<ContainerGroup>((resolve) => {
                    createCalled = true;
                    resolve();            
                })
            },
            () => {
                return new Promise<void>((resolve) => {
                    startCalled = true;
                    resolve();
                });
            },
            () => {
                return new Promise<void>((resolve) => {
                    restartCalled = true;
                    resolve();
                });
            }
        );

        assert.equal(createCalled, false);
        assert.equal(startCalled, true);
        assert.equal(restartCalled, false);
    });

    it("Restarts an existing group if a match is found that was terminated", () => {
        let createCalled = false;
        let startCalled = false;
        let restartCalled = false;
        let matchInfo = new GroupMatchInformation();

        matchInfo.Group = {} as ContainerGroup;
        matchInfo.Name = "foo";
        matchInfo.WasTerminated = true;

        sut!.InvokeCreationDelegate(matchInfo, 
            () => {
                return new Promise<ContainerGroup>((resolve) => {
                    createCalled = true;
                    resolve();            
                })
            },
            () => {
                return new Promise<void>((resolve) => {
                    startCalled = true;
                    resolve();
                });
            },
            () => {
                return new Promise<void>((resolve) => {
                    restartCalled = true;
                    resolve();
                });
            }
        );

        assert.equal(createCalled, false);
        assert.equal(startCalled, false);
        assert.equal(restartCalled, true);
    });
});