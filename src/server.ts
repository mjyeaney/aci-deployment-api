import * as dotenv from "dotenv";
import * as express from "express";
import * as bodyParser from "body-parser";
import { ILogger, GroupMatchInformation, IPendingOperationCache, IGroupMatchingStrategy, IContainerService, IReportingService } from "./common-types";
import { ConsoleLogger } from "./logging";
import { ContainerService }  from "./container-service";
import { ReportingService }  from "./reporting-service";
import { ConfigurationService, IConfigService } from "./config-service";
import { ContainerGroupListResult, ContainerGroup } from "azure-arm-containerinstance/lib/models";
import { PendingOperationCache } from "./pending-operation-cache";
import { DefaultMatchingStrategy } from "./default-matching-strategy";
import { ICleanupTaskRunner, CleanupTaskRunner } from "./cleanup-tasks";

// Init environment
dotenv.config();

// Setup services
const logger: ILogger = new ConsoleLogger();
const config: IConfigService = new ConfigurationService();
const app: express.Application = express();
const pendingCache: IPendingOperationCache = new PendingOperationCache(logger);
const matchStrategy: IGroupMatchingStrategy = new DefaultMatchingStrategy();
const aci: IContainerService = new ContainerService(logger, config, matchStrategy, pendingCache);
const reporting: IReportingService = new ReportingService(logger, config, aci);
const cleanupManager: ICleanupTaskRunner = new CleanupTaskRunner(logger, pendingCache, aci);

// Startup background jobs on this node
reporting.Initialize();
cleanupManager.ScheduleAll();

// Enables parsing of application/x-www-form-urlencoded MIME type
// and JSON
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// Check for the PORT env var from the azure host
// Why strings here? Note tha the environment variable *may* be a named pipe
// definition, which will be defined as a string. 
const port: string | number = process.env.PORT || "8009";
logger.Write(`Environment process.env.PORT = ${process.env.PORT}`);
logger.Write(`Environment configured with port = ${port}`); 

//
// Helper fn to set no-cache headers for API methods
//
const setNoCache = function(res: express.Response){
    res.append("Cache-Control", "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0");
};

// 
// Introspection API methods
//
app.post("/api/test/getGroupMatchInfo", async (req: express.Request, resp: express.Response) => {
    setNoCache(resp);

    aci.GetMatchingGroupInfo(req.body.numCpu, req.body.memoryInGB, req.body.tag).then((data: GroupMatchInformation) => {
        resp.json(data);
    }).catch((reason: any) => {
        resp.status(500).json(reason);
    });
});
app.get("/api/test/getPendingDeployments", async (req: express.Request, resp: express.Response) => {
    setNoCache(resp);
    
    pendingCache.GetPendingOperations().then((names: string[]) => {
        resp.json(names);
    }).catch((reason: any) => {
        resp.status(500).json(reason);
    });
});

// 
// Main API methods
//
app.get("/api/overviewSummary", async (req: express.Request, resp: express.Response) => {
    logger.Write("Executing GET /api/overviewSummary...");
    setNoCache(resp);

    reporting.GetOverviewDetails().then((data) => {
        resp.json(data);
    }).catch((reason) => {
        resp.status(500).json(reason);
    })
});
app.get("/api/configuration", async (req: express.Request, resp: express.Response) => {
    logger.Write("Executing GET /api/configuration...");
    setNoCache(resp);
    resp.json(config.GetConfiguration());
});
app.get("/api/authinfo", async (req: express.Request, resp: express.Response) => {
    logger.Write("Executing GET /api/authinfo...");
    setNoCache(resp);

    let userName: string | undefined = "Unknown User";
    let userPrincipalName: string | undefined = "unknown-user";

    if (req.header("X-MS-CLIENT-DISPLAY-NAME")){
        userName = req.header("X-MS-CLIENT-DISPLAY-NAME");
    }

    if (req.header("X-MS-CLIENT-PRINCIPAL-NAME")){
        userPrincipalName = req.header("X-MS-CLIENT-PRINCIPAL-NAME");
    }

    resp.json({
        UserName: userName,
        PrincipalName: userPrincipalName
    });
});
app.get("/api/deployments", async (req: express.Request, resp: express.Response) => {
    logger.Write("Executing GET /api/deployments...");
    setNoCache(resp);

    aci.GetDeployments().then((data: ContainerGroupListResult) => {
        resp.json(data);
    }).catch((reason: any) => {
        resp.status(500).json(reason);
    });
});
app.post("/api/deployments", async (req: express.Request, resp: express.Response) => {
    logger.Write("Executing POST /api/deployments...");
    setNoCache(resp);
    
    if ((!req.body) || (!req.body.numCpu) || (!req.body.memoryInGB)) {
        logger.Write("Invalid request to /api/deployments");
        resp.status(400).end();
    } else {
        // Note that 'tag' is optional
        let tag = req.body.tag;
        let numCpu = req.body.numCpu;
        let memory = req.body.memoryInGB;

        aci.CreateNewDeployment(numCpu, memory, tag).then((data: ContainerGroup) => {
            resp.json(data);
        }).catch((reason: any) => {
            resp.status(500).json(reason);
        });
    }
});
app.get("/api/deployments/:deploymentId", async (req: express.Request, resp: express.Response) => {
    logger.Write(`Executing GET /api/deployments/${req.params.deploymentId}...`);
    setNoCache(resp);

    aci.GetDeployment(req.params.deploymentId).then((data: ContainerGroup) => {
        resp.json(data);
    }).catch((reason: any) => {
        resp.status(500).json(reason);
    });
});
app.post("/api/deployments/:deploymentId/stop", async (req: express.Request, resp: express.Response) => {
    logger.Write(`Executing POST /api/deployments/${req.params.deploymentId}/stop...`);
    setNoCache(resp);

    aci.StopDeployment(req.params.deploymentId).then(() => {
        resp.status(200).end();
    }).catch((reason: any) => {
        resp.status(500).json(reason);
    });
});
app.delete("/api/deployments/:deploymentId", async (req: express.Request, resp: express.Response) => {
    logger.Write(`Executing DELETE /api/deployments/${req.params.deploymentId}...`);
    setNoCache(resp);
    
    aci.DeleteDeployment(req.params.deploymentId).then(() => {
        resp.status(200).end();
    }).catch((reason: any) => {
        resp.status(500).json(reason);
    });
});

//
// Enable basic static resource support
//
app.use(express.static(__dirname, {
    index : "/static/index.html",
}));

//
// Init server listener loop
//
const server = app.listen(port, function () {
    logger.Write(`Server started - ready for requests`);
});