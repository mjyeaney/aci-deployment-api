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

* If the requested CPU, memory, and Docker image tag all match the current pool configuration (governed by `POOL_CPU_COUNT`, `POOL_MEM_GB`, and `POOL_CONTAINER_IMAGE_TAG`), proceed. Otherwise, begine a synchronous / blocking deployment (client will have to wait until deployment is finished).
* If `N > POOL_MINIMUM_SIZE`, the first instance (sorted lexicographicly) is returned to the client and marked as "in use".
* If `N < POOL_MINIMUM_SIZE` _and_ `N > 0`, the first instance (sorted lexicographicly) is returned to the client and marked as "in use". Additionally, a background task is started to replace this in-use instance in order to re-populate the pool.
* If `N = 0`, an error is returned to the client that there are currently no available instances. A background task is started to replace this in-use instance in order to re-populate the pool.

### Garbage Colleciton

For additional context, see [Issue #19](https://github.com/mjyeaney/aci-deployment-api/issues/19#issue-399963094).

Since container re-use is predicated on the `image` property of a container group, the re-use implementation will discrimitate between identical container images that have different tags, due to the fact that there is currently no seperate field for tag. Because of this, older tagged containers that are stopped or terminated will build up in the system not be reused, leading too a build-up of old deployments. To combat this, there is a background scavenger (implemented in `/src/cleanup-tasks.ts`) that will look for any conatainer deployments that have been `stopped` or `terminted` for at least 4 hours, and if any are found, delete them. 