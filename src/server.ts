import { ILogger, ConsoleLogger } from "./logging";
import * as dotenv from "dotenv";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as containerServices from "./container-services";

// Init environment
dotenv.config();

// Setup logger
const logger: ILogger = new ConsoleLogger();

// Init ACI services and the express engine
const aci = new containerServices.ContainerServices();
const app: express.Application = express();

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
app.get("/api/getActiveDeployments", (req: express.Request, resp: express.Response) => {
    setNoCache(resp);
    resp.json({
        data: [1, 2, 3]
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