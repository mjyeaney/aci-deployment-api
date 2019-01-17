## Container Group allocation

When a client requests a deployment, the application first enumerates all current container groups looking for any group that matches the following:

* Same CPU count
* Same memory (in GB) allocation
* Same image:tag combination
* Currently in a `Stopped` or `Terminated` state**.

If no matching containers are found, a new Container Group deployment is initiated. However, if a container group is found that matches the above properties, this group is simply issues a `start` command. 

** Note that instances which terminate need to follow the `re-start` command; this is different from a node that has been stopped from the ARM management plane (which uses the `start` command).

### Garbage Colleciton (TODO)

For additional context, see [Issue #19](https://github.com/mjyeaney/aci-deployment-api/issues/19#issue-399963094).

While we could let container groups exist forever (and just continue being re-used), we may miss any updates to the underlying Docker image since starting a stopped image doesn't pull any image updates. In this case, any containers that are older than one day (24 hours) should likely be removed by a background garbage collection job. This garbage collection could easily be implemented by timer-triggered Function instances, and will be deployed in a later build.