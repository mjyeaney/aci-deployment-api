import { ILogger, ConsoleLogger } from "./logging";
import * as dotenv from "dotenv";
import * as express from "express";
import * as bodyParser from "body-parser";

dotenv.config();

// Setup logger
const logger: ILogger = new ConsoleLogger();

// Init the express engine
const app: express.Application = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
 
// parse application/json
app.use(bodyParser.json())

// Check for the PORT env var from the azure host
const port = process.env.PORT || 8009;

//
// Helper fn to set no-cache headers
//
// const setNoCache = function(res: Response){
//     res.headers.append("Cache-Control", "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0");
// };

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