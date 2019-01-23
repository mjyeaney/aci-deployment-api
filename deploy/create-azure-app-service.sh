#!/bin/bash

# script variables
location=eastus
resource_group_name=SamplePortalRG
appservice_plan_name=SamplePortalAppPlan
appservice_plan_size=B1
webapp_name=SamplePortalApp

# Create the app service plan, web app, and default NODEJS version
az appservice plan create -n $appservice_plan_name -g $resource_group_name -l $location --sku $appservice_plan_size
az webapp create -n $webapp_name -g $resource_group_name --plan $appservice_plan_name
az webapp config appsettings set -g $resource_group_name -n $webapp_name --settings WEBSITE_NODE_DEFAULT_VERSION=10.6.0

# Set configuration settings
az webapp config appsettings set -g $resource_group_name -n $webapp_name --settings TENANT_ID=
az webapp config appsettings set -g $resource_group_name -n $webapp_name --settings CLIENT_ID=
az webapp config appsettings set -g $resource_group_name -n $webapp_name --settings CLIENT_SECRET=
az webapp config appsettings set -g $resource_group_name -n $webapp_name --settings SUBSCRIPTION_ID=
az webapp config appsettings set -g $resource_group_name -n $webapp_name --settings REGION=
az webapp config appsettings set -g $resource_group_name -n $webapp_name --settings RESOURCE_GROUP_NAME=
az webapp config appsettings set -g $resource_group_name -n $webapp_name --settings CONTAINER_IMAGE=
az webapp config appsettings set -g $resource_group_name -n $webapp_name --settings CONTAINER_PORT=
az webapp config appsettings set -g $resource_group_name -n $webapp_name --settings CONTAINER_OS_TYPE=
az webapp config appsettings set -g $resource_group_name -n $webapp_name --settings CONTAINER_REGISTRY_HOST=
az webapp config appsettings set -g $resource_group_name -n $webapp_name --settings CONTAINER_REGISTRY_USERNAME=
az webapp config appsettings set -g $resource_group_name -n $webapp_name --settings CONTAINER_REGISTRY_PASSWORD=
az webapp config appsettings set -g $resource_group_name -n $webapp_name --settings REPORTING_REFRESH_INTERVAL=

# Setup Easy Auth
az webapp auth update  -g $resource_group_name -n $webapp_name --enabled true \
                          --action LoginWithAzureActiveDirectory \
                          --aad-allowed-token-audiences https://webapp_name.azurewebsites.net/.auth/login/aad/callback \
                          --aad-client-id service_principal_id --aad-client-secret service_principal_secret \
                          --aad-token-issuer-url https://sts.windows.net/aad_tenant_id/