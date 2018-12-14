## ACI Deployment API

This project presents an API shim to deploy configured Azure Container Instances on the fly, and give a preliminary dashboard to monitoring status of the deployed / running images. 

![Screenshot](docs/basic-screenshot.png)

### API Methods

The following API methods are exposed from this application:

* `GET /api/deployments`
    * This lists all active deployments, and currently returns the same JSON format that the Azure REST api does.
* `POST /api/deployments`
    * This requires a body payload describing the number of CPU's and memory that are requested, such as `{numCpu:2, memoryInGB: 2}`.
    * Note this is a synchronous / blocking call - implementing the job/polling mechanism correctly was going to add more work that was necessary for this PoC.
* `GET /api/deployments/{deployment-name}`
    * This will return details about the specific deployment.

### Building

There are tasks defined in `package.json` that are used to build the application. The most common one will be `npm run build`, which will create the `/dist` folder that is to be used for final depoloyment. 

Note that on Azure AppServices environments, this folder should be the root of the ZIP deployment package.

### Deployment

The can be deployed via any appropriate service (i.e., AppService, ACS, etc.), but will require the following environment variables to be set:

```
TENANT_ID=
CLIENT_ID=
CLIENT_SECRET=
SUBSCRIPTION_ID=
REGION=
RESOURCE_GROUP_NAME=
CONTAINER_IMAGE=
CONTAINER_PORT=
CONTAINER_OS_TYPE=
CONTAINER_REGISTRY_HOST=
CONTAINER_REGISTRY_USERNAME=
CONTAINER_REGISTRY_PASSWORD=
```

For local development, you may place a `.env` file in your root folder to set these variables.

### Topics

* [Architecture Overview](docs/ArchitectureOverview.md)
* [Container Group Reuse](docs/ContainerGroupReuse.md)

### TODO

The dashboarding experience is rather limited right now, but the intention is to give a better overview on the history of utilization. Note that the reporting data is ephemeral and held only in-memory on the nodes. This needs moved into a persistent storage location.

Additionally, there are some potential issues with the long-running POST requests to `/api/deployments` (which deploys new container groups). This needs replaced with a proper background job system that passes continuation tokens back to the clients.