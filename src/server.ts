import * as dotenv from "dotenv";
import * as express from "express";
import * as bodyParser from "body-parser";
import { ILogger, ConsoleLogger } from "./logging";
import * as containerServices from "./container-services";

// Init environment
dotenv.config();

// Setup logger
const logger: ILogger = new ConsoleLogger();

// Init ACI services and the express engine
const app: express.Application = express();
const aci = new containerServices.ContainerServices();

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
// API methods
//
app.get("/api/deployments", async (req: express.Request, resp: express.Response) => {
    setNoCache(resp);
    aci.GetDeployments().then((data) => {
        resp.json(data);
    }).catch((reason) => {
        resp.status(500).json(reason);
    });
});
app.post("/api/test/getGroupName", async (req: express.Request, resp: express.Response) => {
    setNoCache(resp);
    aci.GetMatchingGroupName(req.body.numCpu, req.body.memoryInGB).then((data) => {
        resp.json(data);
    }).catch((reason) => {
        resp.status(500).json(reason);
    });
});
app.post("/api/deployments", async (req: express.Request, resp: express.Response) => {
    setNoCache(resp);
    
    if ((!req.body) || (!req.body.numCpu) || (!req.body.memoryInGB)) {
        logger.LogMessage("Invalid request to /api/deployments");
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
    setNoCache(resp);
    aci.GetDeployment(req.params.deploymentId).then((data) => {
        resp.json(data);
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
    logger.LogMessage(`Server now listening at http://${host}:${port}`);
});