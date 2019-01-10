//
// Exposes methods for reading configuration
//

import { ConfigurationDetails } from "./common-types";

export interface IConfigService {
    GetConfiguration(): ConfigurationDetails;
}

export class ConfigurationService implements IConfigService {
    public GetConfiguration() {
        const config = new ConfigurationDetails();
        config.TenantId = process.env.TENANT_ID;
        config.SubscriptionId = process.env.SUBSCRIPTION_ID;
        config.Region = process.env.REGION;
        config.ResourceGroup = process.env.RESOURCE_GROUP_NAME;
        config.ContainerImage = process.env.CONTAINER_IMAGE;
        config.ContainerPort = parseInt(process.env.CONTAINER_PORT!);
        config.ContainerOs = process.env.CONTAINER_OS_TYPE;
        config.ReportingRefreshInterval = process.env.REPORTING_REFRESH_INTERVAL;
        return config;
    }
}