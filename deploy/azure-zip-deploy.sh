#!/bin/bash

# script variables
resource_group_name=aci-api-testing
webapp_name=aciwebportal

# copy supporting files/folders
echo -n "Copying web.config file to /dist..."
cp deploy/web.config dist/
echo "Done!"
echo -n "Copying node_modules to /dist..."
cp -r node_modules dist/
echo "Done!"

# Remove any .ENV files
echo -n "Removing environment files..."
rm -f dist/.env
echo "Done!"

# Create the zip file and deploy
echo -n "Creating ZIP deployment file..."
cd ./dist
zip -q -r ../deploy/deploy.zip .
cd ..
echo "Done!"

# Initiate zip deployment
echo "Starting Azure deployment..."
az webapp deployment source config-zip -n $webapp_name -g $resource_group_name --src deploy/deploy.zip
echo "Done!"

# Remove zip file
rm -f deploy/deploy.zip