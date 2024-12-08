#!/bin/bash
# Deploy chaincode for Org1

set -e

# Variables
CHAINCODE_NAME="secureshare"
CHANNEL_NAME="mychannel"
CHAINCODE_VERSION="1.1"
CHAINCODE_SOURCE_DIR="/home/jquan/hackathon/godamlah/SecureShare/chaincode/secureshare-chaincode"
BUILD_DIR="$CHAINCODE_SOURCE_DIR/build/libs"
CHAINCODE_JAR="$BUILD_DIR/secureshare-chaincode-1.0-SNAPSHOT.jar"
CHAINCODE_PACKAGE="$CHAINCODE_SOURCE_DIR/${CHAINCODE_NAME}_package.tar.gz"
ORDERER_CA="/home/jquan/hackathon/godamlah/SecureShare/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

# Set environment variables for Org1
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="/home/jquan/hackathon/godamlah/SecureShare/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="/home/jquan/hackathon/godamlah/SecureShare/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_ADDRESS="localhost:7051"

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

# Ensure chaincode JAR exists
if [ ! -f "$CHAINCODE_JAR" ]; then
    echo "Building chaincode JAR..."
    cd "$CHAINCODE_SOURCE_DIR"
    ./gradlew clean build
fi

# Package chaincode
if [ ! -f "$CHAINCODE_PACKAGE" ]; then
    echo "Packaging the chaincode..."
    peer lifecycle chaincode package "$CHAINCODE_PACKAGE" --path "$CHAINCODE_SOURCE_DIR" \
        --lang java --label "${CHAINCODE_NAME}_${CHAINCODE_VERSION}"
fi

# Install chaincode on Org1
if ! peer lifecycle chaincode queryinstalled | grep -q "${CHAINCODE_NAME}_${CHAINCODE_VERSION}"; then
    echo "Installing the chaincode on Org1..."
    peer lifecycle chaincode install "$CHAINCODE_PACKAGE"
fi

# Get package ID
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep "${CHAINCODE_NAME}_${CHAINCODE_VERSION}" | awk -F 'Package ID: ' '{print $2}' | awk -F ',' '{print $1}')

# Approve chaincode for Org1
echo "Approving the chaincode for Org1..."
peer lifecycle chaincode approveformyorg -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls --cafile "$ORDERER_CA" \
    --channelID "$CHANNEL_NAME" --name "$CHAINCODE_NAME" --version "$CHAINCODE_VERSION" \
    --package-id "$PACKAGE_ID" --sequence 1

echo "Chaincode deployment and approval for Org1 completed."
