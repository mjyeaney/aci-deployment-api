// import * as Assert from "assert";
// import { ContainerInstancePool } from "../../pooling/containerInstancePool";
// import { IContainerService, ILogger, ConfigurationDetails, IPoolStateStore } from "../../commonTypes";
// import { IConfigurationService } from "../../configService";
// import { ContainerGroup, ContainerGroupListResult } from "azure-arm-containerinstance/lib/models";

// class MockConfig implements IConfigurationService {
//     GetConfiguration(): ConfigurationDetails {
//         // Count calls
//         PARALLEL_CALL_COUNT++;

//         const config = new ConfigurationDetails();
//         // setup as needed
//         config.PoolMinimumSize = POOL_MINIMUM_SIZE;
//         return config;
//     }
// }

// class MockLogger implements ILogger {
//     Write(message: string): void { console.log(message); }
// }

// class MockPoolStateStore implements IPoolStateStore {
//     GetFreeMemberIDs(): Promise<string[]> {
//         return new Promise<string[]>((resolve) => {
//             const freeMembers: Array<string> = [];
//             for (let i = 1; i <= FREE_MEMBER_COUNT; i++){
//                 freeMembers.push(`${i}/${i}`);
//             }
//             resolve(freeMembers);
//         });
//     }
//     GetInUseMemberIDs(): Promise<string[]> {
//         return new Promise<string[]>((resolve) => {
//             const freeMembers: Array<string> = [];
//             for (let i = 1; i <= INUSE_MEMBER_COUNT; i++){
//                 freeMembers.push(`${i}/${i}`);
//             }
//             resolve(freeMembers);
//         });
//     }
//     UpdateMember(memberId: string, inUse: boolean): Promise<void> {
//         return new Promise<void>((resolve) => {
//             LAST_TAG_UPDATE_RESOURCE_ID = memberId;
//             LAST_TAG_UPDATE_VALUE = inUse ? "InUse" : "Free";
//             resolve();
//         });
//     }
//     RemoveMember(memberId: string): Promise<void> {
//         throw "Method not implemented";
//     }
// }

// class EmptyContainerGroup implements ContainerGroup {
//     identity?: any;
//     provisioningState?: string;
//     containers: any;
//     imageRegistryCredentials?: any;
//     restartPolicy?: string;
//     ipAddress?: any;
//     osType: string = "";
//     volumes?: any;
//     instanceView?: any;
//     diagnostics?: any;
//     networkProfile?: any;
//     dnsConfig?: any;
//     id?: string;
//     name?: string;
//     type?: string;
//     location?: string;
//     tags?: { [propertyName: string]: string; };
// }

// class MockContainerService implements IContainerService {
//     GetDeployments(): Promise<ContainerGroupListResult> {
//         throw new Error("method not implemented");
//     }
//     GetDeployment(containerGroupName: string): Promise<ContainerGroup>{
//         return new Promise<ContainerGroup>((resolve) => {
//             if (PARALLEL_CALL_COUNT === 1) {
//                 PARALLEL_CALL_COUNT--;
//             }
//             let instance = new EmptyContainerGroup();
//             instance.name = containerGroupName;
//             instance.id = containerGroupName;
//             resolve(instance);
//         });
//     }
//     CreateNewDeployment(numCpu: number, memoryInGB: number, tag: string | undefined): Promise<ContainerGroup>{
//         return new Promise<ContainerGroup>((resolve) => {
//             if (PARALLEL_CALL_COUNT === 1) {
//                 PARALLEL_CALL_COUNT--;
//             }
//             resolve(new EmptyContainerGroup());
//         });
//     }
//     BeginCreateNewDeployment(numCpu: number, memoryInGB: number, imageTag: string | undefined): Promise<ContainerGroup>{
//         throw new Error("method not implemented");
//     }
//     StopDeployment(containerGroupName: string): Promise<void>{
//         throw new Error("method not implemented");
//     }
//     DeleteDeployment(containerGroupName: string): Promise<void>{
//         throw new Error("method not implemented");
//     }
//     GetFullConatinerDetails(): Promise<ContainerGroup[]>{
//         throw new Error("method not implemented");
//     }
// }

// // Create mock instances
// let mockConfig: IConfigurationService = new MockConfig();
// let mockLogger: ILogger = new MockLogger();
// let mockPoolStateStore: IPoolStateStore = new MockPoolStateStore();
// let mockContainerService: IContainerService = new MockContainerService();

// // Control params / flags
// let PARALLEL_CALL_COUNT = 0;
// let POOL_MINIMUM_SIZE = 2;
// let FREE_MEMBER_COUNT = 5;
// let INUSE_MEMBER_COUNT = 3;
// let LAST_TAG_UPDATE_RESOURCE_ID = "";
// let LAST_TAG_UPDATE_VALUE = "";

// // Create system under test
// const sut = new ContainerInstancePool(mockPoolStateStore, mockContainerService, mockConfig, mockLogger);

// describe("ContainerInstancePool", () => {
//     describe("GetPooledContainerInstance", () => {
//         it("Only allows serial execution", async () => {
//             // Dispatch a bunch of parallel work
//             let tasks: Array<Promise<ContainerGroup>> = [];
//             for (let i = 0; i < 3; i++){
//                 tasks.push(sut.GetPooledContainerInstance(2, 2, ""));
//             }

//             // Wait for work to finish
//             await Promise.all(tasks);

//             // Verify that parallel counter was only EVER 1, which means is should be zero
//             Assert.equal(PARALLEL_CALL_COUNT, 0);
//         });

//         it("If free members >= POOL_MINIMUM_SIZE, return first running instance, and mark as in-use.", async () => {
//             FREE_MEMBER_COUNT = 5;
//             POOL_MINIMUM_SIZE = 2;

//             let instance = await sut.GetPooledContainerInstance(2, 2, "");

//             Assert.equal(instance.name!, "1");
//             Assert.equal(LAST_TAG_UPDATE_RESOURCE_ID, "1/1");
//             Assert.equal(LAST_TAG_UPDATE_VALUE, "InUse");
//         });
//     });
// });