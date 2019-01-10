## Architecture Overview

The overall application architecture is show in the following diagram:

![Architecture Overview](architecture-overview.png)

Note this applicaiton is serving as an API intermediary between requesting clients and the actual management plane API's in Azure. This allow proper seperation of security contexts, enabling clients to operate without the need to have the full deployment priviledges required to create resources. 

### Call Sequence

A typical call sequence will look something like the following:

![Request Deployment Sequence](request-deployment-sequence.png)

Here we can see the client using a low-priviledge API method to initiate the actual resource deployment. This deployment is done using a Servcie Principal that is scoped appropriately and has sufficient permissions.