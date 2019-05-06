## Frequently Asked Questions

### Why App Service?

This specific project was intentionally deployed as a single Web App to help facilitate simple deployments for teams new to Azure. However, it is a logical next step to decompose the appliction into a more microservice-based approach, likely using Functions, API Management, and some coordinating store (such as Redis or CosmosDB). 

Note however, that the deployment will necessarily need to be more complicated, and definitely has more moving parts. This needs careful consideration, as it will have impact on the team(s) that will be deploying, developing, and maintaining the solution.

### Where is the pool data stored?

Currently the pool state data is stored as a JSON-serialized file on the underlying AppService shared file system. There two physical files that contain the pool state, namely:

* `/data/psiu.json` - This is the collection of In-Use members (`psiu` = Pool State In Use)
* `/data/psf.json` - This is the collection of Free members (`psf` = Pool State Free)

Note that since these files are created by the application (and not placed during deployment), these files will be preserved during ZIP deploy operations. See more details [here](https://github.com/projectkudu/kudu/wiki/Deploying-from-a-zip-file-or-url).

Note that this data can be backed up by leveraging the Backup/Restore functionality provided by AppService.