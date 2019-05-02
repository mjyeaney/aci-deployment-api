## Architecture Overview

The overall application architecture is show in the following diagram:

![Architecture Overview](architecture-overview.png)

Note this applicaiton is serving as an API intermediary between requesting clients and the actual management plane API's in Azure. This allow proper seperation of security contexts, enabling clients to operate without the need to have the full deployment priviledges required to create resources. 

Drilling into the archtiecture diagram above (on the "ACI API" block), we can see the internal relationship between the pool manager, pool state store, and ACI API methods as shown below:

![Architecture Level 2](architecture-level-2.png)

Note that the pool state store is leveraging the shared file system of Azure App Service that provides cluster-wide storage to each member of a given deployment.