import * as dotenv from "dotenv";
import * as express from "express";
import * as bodyParser from "body-parser";
import { ILogger, IContainerService, IReportingService, ITaskRunner, IPoolStateStore, IContainerInstancePool } from "./commonTypes";
import { ConsoleLogger } from "./logging";
import { ConfigurationService, IConfigurationService } from "./configService";
import { ContainerGroupListResult, ContainerGroup } from "azure-arm-containerinstance/lib/models";
import { ContainerService }  from "./containerService";
import { ContainerInstancePool } from "./pooling/containerInstancePool";
import { PoolStateStore } from "./pooling/poolStateStore";
import { ReportingService }  from "./reporting/reportingService";
import { DefaultTaskRunner } from "./jobs/defaultTaskRunner";

// Init environment
dotenv.config();

// Setup services
const app: express.Application = express();
const logger: ILogger = new ConsoleLogger();
const config: IConfigurationService = new ConfigurationService();
const aci: IContainerService = new ContainerService(logger, config);
const poolStateStore: IPoolStateStore = new PoolStateStore(logger);
const pool: IContainerInstancePool = new ContainerInstancePool(poolStateStore, aci, config, logger);
const reporting: IReportingService = new ReportingService(logger, config, poolStateStore);
const taskRunner: ITaskRunner = new DefaultTaskRunner(logger, aci, poolStateStore);

// Startup background tasks
pool.Initialize();
reporting.Initialize();
taskRunner.ScheduleAll();

// Enables parsing of application/x-www-form-urlencoded MIME type
// and JSON body payloads
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

        pool.GetPooledContainerInstance(numCpu, memory, tag).then((data: ContainerGroup) => {
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

app.post("/api/deployments/:deploymentId/release", async (req: express.Request, resp: express.Response) => {
    logger.Write(`Executing POST /api/deployments/${req.params.deploymentId}/release...`);
    setNoCache(resp);

    aci.GetDeployment(req.params.deploymentId).then((containerGroup) => {
        poolStateStore.UpdateMember(containerGroup.id!, false).then(() => {
            resp.status(200).end();
        }).catch((reason: any) => {
            resp.status(500).json(reason);
        });
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
app.listen(port, function () {
    logger.Write(`Server started - ready for requests`);
});