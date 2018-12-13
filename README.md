## ACI Deployment API

This project presents an API shim to deploy configured Azure Container Instances on the fly, and give a preliminary dashboard to monitoring status of the deployed / running images. 

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

### TODO

The dashboarding experience is rather limited right now, but the intention is to give a better overview on the history of utilization. Note that the reporting data is ephemeral and held only in-memory on the nodes. This needs moved into a persistent storage location.

Additionally, there are some potential issues with the long-running POST requests to `/api/deployments` (which deploys new container groups). This needs replaced with a proper background job system that passes continuation tokens back to the clients.