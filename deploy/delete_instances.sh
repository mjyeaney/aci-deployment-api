#!/bin/bash

# This file deletes all instances currently deployed - update as needed
ACI_API_HOST="https://localhost:8009/api/deployments"

instances=$(curl -s $ACI_API_HOST | jq -r '.[].name')

for i in $instances; 
do 
    echo -n "Deleting $i..."
    curl -X DELETE $ACI_API_HOST/$i
    echo "done."
done
