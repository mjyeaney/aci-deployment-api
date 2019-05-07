import * as Assert from "assert";
import { ContainerInstancePool } from "../../pooling/containerInstancePool";
import { IContainerService, ILogger, ConfigurationDetails, IPoolStateStore, TaskScheduleInfo } from "../../commonTypes";
import { IConfigurationService } from "../../configService";
import { ContainerGroup } from "azure-arm-containerinstance/lib/models";
import { MockContainerService } from "../mockContainerService";
import { MockPoolStateStore } from "../mockPoolStateStore";
import { MockLogger } from "../mockLogger";

class MockConfig implements IConfigurationService {
    GetConfiguration(): ConfigurationDetails {
        const config = new ConfigurationDetails();
        // setup as needed
        config.PoolMinimumSize = 5;
        config.PoolMemoryInGB = 2;
        config.PoolContainerImageTag = "";
        config.PoolCpuCount = 2;
        return config;
    }
}

// Create mock instances
let mockConfig: IConfigurationService = new MockConfig();
let mockLogger: ILogger = new MockLogger();
let poolStateStore: IPoolStateStore = new MockPoolStateStore();
let containerService: IContainerService = new MockContainerService();

// Create system under test
const sut = new ContainerInstancePool(poolStateStore, containerService, mockConfig, mockLogger);

// Helper to reset all state
const resetState = async () => {
    // List all deployments
    let deployments = await containerService.GetDeployments();
    deployments.forEach(async d => {
        await sut.RemovePooledContainerInstance(d.name!);
    });
};

describe("ContainerInstancePool", () => {
    describe("GetPooledContainerInstance", () => {
        it("Once initialized, should return pooled instances and replace them", async () => {
            await sut.Initialize();
            
            // Dispatch a bunch of parallel work
            let tasks: Array<Promise<ContainerGroup>> = [];
            for (let i = 0; i < 3; i++){
                tasks.push(sut.GetPooledContainerInstance(2, 2, ""));
            }

            // Wait for work to finish
            await Promise.all(tasks);

            // Should only be 3+5 containers deployed
            let finalDeployments = await containerService.GetDeployments();
            Assert.equal(finalDeployments.length, 8);

            // Should be 3 in-use
            let finalInUse = await poolStateStore.GetInUseMemberIDs();
            Assert.equal(finalInUse.length, 3);

            // Should be 5 free
            let finalFree = await poolStateStore.GetFreeMemberIDs();
            Assert.equal(finalFree.length, 5);

            // Cleanup
            await resetState();
        });

        it("Only allows serial execution", async () => {
            // Dispatch some parallel work
            let tasks: Array<Promise<ContainerGroup>> = [];
            for (let i = 0; i < 5; i++){
                tasks.push(sut.GetPooledContainerInstance(2, 2, ""));
            }

            // Wait for work to finish
            await Promise.all(tasks);

            // Should only be 5 since this test had no available
            let finalDeployments = await containerService.GetDeployments();
            Assert.equal(finalDeployments.length, 5);

            // Cleanup
            await resetState();
        });
    });
});