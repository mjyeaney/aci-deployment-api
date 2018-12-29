import * as dotenv from "dotenv";
import * as express from "express";
import * as bodyParser from "body-parser";
import { ILogger, ConsoleLogger } from "./logging";
import * as containerServices from "./container-services";
import * as summaryServices from "./summary-services";

// Init environment
dotenv.config();

// Setup services
const logger: ILogger = new ConsoleLogger();
const app: express.Application = express();
const aci = new containerServices.ContainerServices(logger);
const reporting = new summaryServices.SummaryServices(logger, aci);

// Enables parsing of application/x-www-form-urlencoded MIME type
// and JSON
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// Check for the PORT env var from the azure host
const port: number = parseInt(process.env.PORT || "8009");

//
// Helper fn to set no-cache headers for API methods
//
const setNoCache = function(res: express.Response){
    res.append("Cache-Control", "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0");
};

// 
// Testing API methods
//
app.post("/api/test/getGroupInfo", async (req: express.Request, resp: express.Response) => {
    setNoCache(resp);
    aci.GetMatchingGroupInfo(req.body.numCpu, req.body.memoryInGB).then((data) => {
        resp.json(data);
    }).catch((reason) => {
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
app.get("/api/deployments", async (req: express.Request, resp: express.Response) => {
    logger.Write("Executing GET /api/deployments...");
    setNoCache(resp);
    aci.GetDeployments().then((data) => {
        resp.json(data);
    }).catch((reason) => {
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
        aci.CreateNewDeployment(req.body.numCpu, req.body.memoryInGB).then((data) => {
            resp.json(data);
        }).catch((reason) => {
            resp.status(500).json(reason);
        });
    }
});
app.get("/api/deployments/:deploymentId", async (req: express.Request, resp: express.Response) => {
    logger.Write(`Executing GET /api/deployments/${req.params.deploymentId}...`);
    setNoCache(resp);
    aci.GetDeployment(req.params.deploymentId).then((data) => {
        resp.json(data);
    }).catch((reason) => {
        resp.status(500).json(reason);
    });
});
app.delete("/api/deployments/:deploymentId", async (req: express.Request, resp: express.Response) => {
    logger.Write(`Executing DELETE /api/deployments/${req.params.deploymentId}...`);
    setNoCache(resp);
    aci.DeleteDeployment(req.params.deploymentId).then(() => {
        resp.status(200).end();
    }).catch((reason) => {
        resp.status(500).json(reason);
    });
});

//
// Enable basic static resource support
//
app.use(express.static(__dirname, {
    index : "/static/index.html"
}));

//
// Init server listener loop
//
const server = app.listen(port, function () {
    var host = server.address().address;
    var port = server.address().port;
    logger.Write(`Server now listening at http://${host}:${port}`);
});