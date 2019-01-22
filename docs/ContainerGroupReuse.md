## Container Group allocation

When a client requests a deployment, the application first enumerates all current container groups looking for any group that matches the following:

* Same CPU count
* Same memory (in GB) allocation
* Same image:tag combination
* Currently in a `Stopped` or `Terminated` state**.

If no matching containers are found, a new Container Group deployment is initiated. However, if a container group is found that matches the above properties, this group is simply issues a `start` command. 

** Note that instances which terminate need to follow the `re-start` command; this is different from a node that has been stopped from the ARM management plane (which uses the `start` command).

### Garbage Colleciton

For additional context, see [Issue #19](https://github.com/mjyeaney/aci-deployment-api/issues/19#issue-399963094).

Since container re-use is predicated on the `image` property of a container group, the re-use implementation will discrimitate between identical container images that have different tags, due to the fact that there is currently no seperate field for tag. Because of this, older tagged containers that are stopped or terminated will build up in the system not be reused, leading too a build-up of old deployments. To combat this, there is a background scavenger (implemented in `/src/cleanup-tasks.ts`) that will look for any conatainer deployments that have been `stopped` or `terminted` for at least 4 hours, and if any are found, delete them. 