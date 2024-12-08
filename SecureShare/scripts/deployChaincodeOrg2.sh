#!/bin/bash
# Deploy chaincode for Org2

set -e

# Variables
CHAINCODE_NAME="secureshare"
CHANNEL_NAME="mychannel"
CHAINCODE_VERSION="1.1"
CHAINCODE_PACKAGE="/home/jquan/hackathon/godamlah/SecureShare/chaincode/secureshare-chaincode/secureshare_package.tar.gz"
ORDERER_CA="/home/jquan/hackathon/godamlah/SecureShare/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

# Set environment variables for Org2
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="/home/jquan/hackathon/godamlah/SecureShare/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="/home/jquan/hackathon/godamlah/SecureShare/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp"
export CORE_PEER_ADDRESS="localhost:9051"

# Query current sequence
echo "Querying current sequence..."
CURRENT_SEQUENCE=$(peer lifecycle chaincode querycommitted -C "$CHANNEL_NAME" -n "$CHAINCODE_NAME" 2>&1 | grep -o 'Sequence: [0-9]*' | cut -d' ' -f2)

if [ -n "$CURRENT_SEQUENCE" ]; then
    # Increment the sequence number
    CHAINCODE_SEQUENCE=$((CURRENT_SEQUENCE + 1))
    echo "Using new sequence number: $CHAINCODE_SEQUENCE"
else
    # If no current sequence (first deployment), use 1
    CHAINCODE_SEQUENCE=1
    echo "First deployment, using sequence number: $CHAINCODE_SEQUENCE"
fi

# Install chaincode on Org2
if ! peer lifecycle chaincode queryinstalled | grep -q "${CHAINCODE_NAME}_${CHAINCODE_VERSION}"; then
    echo "Installing the chaincode on Org2..."
    peer lifecycle chaincode install "$CHAINCODE_PACKAGE"
fi

# Get package ID
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep "${CHAINCODE_NAME}_${CHAINCODE_VERSION}" | awk -F 'Package ID: ' '{print $2}' | awk -F ',' '{print $1}')

# Approve chaincode for Org2
echo "Approving the chaincode for Org2..."
peer lifecycle chaincode approveformyorg -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls --cafile "$ORDERER_CA" \
    --channelID "$CHANNEL_NAME" --name "$CHAINCODE_NAME" --version "$CHAINCODE_VERSION" \
    --package-id "$PACKAGE_ID" --sequence 1

echo "Chaincode deployment and approval for Org2 completed."
