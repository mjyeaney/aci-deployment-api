## Reporting Overview

Reporting features within the application are fairly limited, but still offer a high-level view of the underlying activity. The following metrics are available via the web portal:

* Number of running Container Groups
* Number of stopped Container Groups
* Time-series view over the last 2 hours.
* List of all Container Groups (running or stopped)

Each deployed node triggers a backround routine every one (1) mintue that gathers total counts for both running stopped container groups. Note that this interval is configurable via the `REPORTING_REFRESH_INTERVAL` environment variable, but currently defaults to `PT1M`.

Additionally, there is an in-memory circular buffer that tracks these counts over the last 2 hours (1 sample per minute, 120 buckets total). This data is used to drive the time-series view of the instance counts (note however this is ephemeral storage - see next seciton).

### Long-term storage

Currently, reporing data is kept in-memory per node, and as such is destroyed if a node is restarted and/or crashes. This can later be moved to a longer term persistent storage service, or even broadcast event meterics to Event Hub for downstream consumption from other services. Note also that as this data is kept per-node, there may be slight drifts between nodes as the reporting is not synchronized. Ideally, this background gather routine should be extracted - best serverless candidate would be a timer-triggered Azure Function to write this data into an appropriate storage layer (i.e., Cosmos DB). By leveraging features such as collection time-to-live (TTL), we can essentially recreate the time-series view the application expects without continuously running expensive queries.