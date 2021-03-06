## Container Group Pooling

To help enable rapid delivery of active Container Instances, the ACI Management platform manages a pool of ACI deployments that ensures clients are able to get access to active compute resources. This pool is configured by the following environment variables:

```
POOL_MINIMUM_SIZE=5
POOL_CPU_COUNT=2
POOL_MEM_GB=2
POOL_CONTAINER_IMAGE_TAG=latest
```

These parameters impact the pool behavior as follows:

* `POOL_MINIMUM_SIZE` specifies the count of nodes that should be keps in reserve at all times.
* `POOL_CPU_COUNT` and `POOL_MEM_GB` control the hardware profile for each member in the pool (note that at this time the ACI pool is homogeneous; that is, all members have the same CPU/Memory count. See the behaviors section below on how this may impact clients).
* `POOL_CONTAINER_IMAGE_TAG` specifies the Docker image tag to use for each member of the pool. As noted above, this is the same for all members of the pool.

When a client requests an ACI compute resource, the following decision tree is followed (where `N` represents the current number of free/available instances):

* If the requested CPU, memory, and Docker image tag all match the current pool configuration (governed by `POOL_CPU_COUNT`, `POOL_MEM_GB`, and `POOL_CONTAINER_IMAGE_TAG`), proceed. Otherwise, begin a synchronous / blocking deployment (client will have to wait until deployment is finished).
* If `N > POOL_MINIMUM_SIZE`, the first instance (sorted lexicographicly) is returned to the client and marked as "in use".
* If `N < POOL_MINIMUM_SIZE` _and_ `N > 0`, the first instance (sorted lexicographicly) is returned to the client and marked as "in use". Additionally, a background task is started to replace this in-use instance in order to re-populate the pool.
* If `N = 0`, begin a synchronous / blocking deployment (client will have to wait until deployment is finished).

### Pool Initialization

During applicaiton startup, a single node will attempt to initialze the pool, using the following procedure:

* Check the stored pool state and check if the pool has already been initialzied by another member. If not, proceed.
* Read the currently known in-use and free member lists
* Read any currently deployed ACI resources.
* Compare the saved pool state to the running deployments:
    * If there are any deployments in pool state which are *NOT* currently deployed, remove them from pool state.
    * If there are deployed resources which are *NOT* tracked in pool state, leave them alone (as they may be in use elsewhere).
* Using this modified pool state, note if any additional free instances are needed to be in compliance with `POOL_MINIMUM_SIZE`.
    * If so, create background tasks to create these instances.

### Garbage Collection / Scheduled Tasks

In order to maintain acceptable numbers of pooled deployments, there are is a scheduled task that is in charge of maintaining the overall health of the ACI pool. The current primary use case for this job is as follows.

1. Read all currently running instances, and get their full status.
2. If there are any ACI instances that are stopped / terminated:
    * Delete these instances

A second job that runs is responsible for maintaining acceptable levels of pool resources so as to not incur cost impacts from running un-utilized compute. This job workflow is as follows:

1. Read all currently free instances.
2. If there are more free instances than currently configured pool size (`POOL_MINIMUM_SIZE`), remove excess deployments.

Finally, there is a job that is responsible for maintaining the _minimum_ count of pool members in the event that the platform falls below. This job workflow is as follows:

1. Read all currently free instances.
2. If there are less free instances than are currently configured (`POOL_MINIMUM_SIZE`), create additional members to repopulate the pool.