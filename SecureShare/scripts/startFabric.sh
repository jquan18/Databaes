#!/bin/bash

# SecureShare/scripts/startFabric.sh

# Navigate to fabric-samples test-network
cd ~/hackathon/godamlah/SecureShare/fabric-samples/test-network

# Stop all first
./network.sh down

# Start the network with Certificate Authorities and create a channel
./network.sh up createChannel -ca

# Verify the network is up by listing Docker containers
docker ps
