#!/bin/bash

# Sample testing file that submits 5 'create instance' requests in a row
# Change as needed
ACI_API_HOST="http://localhost:8009/api/deployments"

# This file creates a few instances for testing
echo -n "Starting background jobs..."
curl -s -X POST -H 'Content-Type: application/json' --data '{"numCpu":2,"memoryInGB":2}' $ACI_API_HOST &
curl -s -X POST -H 'Content-Type: application/json' --data '{"numCpu":2,"memoryInGB":2}' $ACI_API_HOST &
curl -s -X POST -H 'Content-Type: application/json' --data '{"numCpu":2,"memoryInGB":2}' $ACI_API_HOST &
curl -s -X POST -H 'Content-Type: application/json' --data '{"numCpu":2,"memoryInGB":2}' $ACI_API_HOST &
curl -s -X POST -H 'Content-Type: application/json' --data '{"numCpu":2,"memoryInGB":2}' $ACI_API_HOST &
echo "done."

# Hang out until the child proc's are done
echo -n "Waiting for completion..."
wait