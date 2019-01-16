#!/bin/bash

# This script simply stops all instances (but does not delete) - update as needed
ACI_API_HOST='http://localhost:8009/api/deployments'

instances=$(curl -s $ACI_API_HOST | jq -r '.[].name')

for i in $instances; 
do 
    curl -X POST -H 'Content-length: 0' $ACI_API_HOST/$i/stop
done