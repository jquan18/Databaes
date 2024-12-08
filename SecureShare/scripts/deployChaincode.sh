#!/bin/bash
# SecureShare/scripts/deployChaincode.sh

# Exit immediately if a command exits with a non-zero status
set -e

# Variables
CHAINCODE_NAME="secureshare"
CHANNEL_NAME="mychannel"
CHAINCODE_VERSION="1.1"
CHAINCODE_SOURCE_DIR="/home/jquan/hackathon/godamlah/SecureShare/chaincode/secureshare-chaincode"
BUILD_DIR="$CHAINCODE_SOURCE_DIR/build/libs"
CHAINCODE_JAR="$BUILD_DIR/secureshare-chaincode-1.0-SNAPSHOT.jar"
CHAINCODE_PACKAGE="$CHAINCODE_SOURCE_DIR/${CHAINCODE_NAME}_package.tar.gz"

# Function to check commit readiness
check_commit_readiness() {
    peer lifecycle chaincode checkcommitreadiness \
        --channelID "$CHANNEL_NAME" \
        --name "$CHAINCODE_NAME" \
        --version "$CHAINCODE_VERSION" \
        --sequence "$CHAINCODE_SEQUENCE" \
        --output json
}

# Ensure the chaincode JAR exists
if [ ! -f "$CHAINCODE_JAR" ]; then
    echo "Chaincode JAR not found at $CHAINCODE_JAR. Building the project using Gradle..."
    cd "$CHAINCODE_SOURCE_DIR"
    ./gradlew clean build
    if [ ! -f "$CHAINCODE_JAR" ]; then
        echo "Failed to build chaincode. Exiting."
        exit 1
    fi
fi

# Package the chaincode
echo "Packaging the chaincode..."
peer lifecycle chaincode package "$CHAINCODE_PACKAGE" --path "$CHAINCODE_SOURCE_DIR/build/libs" \
    --lang java --label "${CHAINCODE_NAME}_${CHAINCODE_VERSION}"

# Navigate to the test network directory
TEST_NETWORK_DIR="/home/jquan/hackathon/godamlah/SecureShare/fabric-samples/test-network"
cd "$TEST_NETWORK_DIR"

# Set environment variables for Org1
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/home/jquan/hackathon/godamlah/SecureShare/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/home/jquan/hackathon/godamlah/SecureShare/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

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

# Check if the chaincode is already installed for Org1
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep "$CHAINCODE_NAME" | awk '{print $3}' | sed 's/,//')

if [ -z "$PACKAGE_ID" ]; then
    # Install the chaincode package if it's not installed
    echo "Installing the chaincode package for Org1..."
    peer lifecycle chaincode install "$CHAINCODE_PACKAGE"
    
    # Get the new package ID after installation
    PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep "$CHAINCODE_NAME" | awk '{print $3}' | sed 's/,//')
    if [ -z "$PACKAGE_ID" ]; then
        echo "Failed to retrieve Package ID. Exiting."
        exit 1
    fi
    echo "Package ID: $PACKAGE_ID"
else
    echo "Chaincode already installed for Org1. Skipping installation."
    echo "Package ID: $PACKAGE_ID"
fi

# Check current approval status
echo "Checking current approval status..."
APPROVE_STATUS=$(check_commit_readiness)
ORG1_APPROVED=$(echo "$APPROVE_STATUS" | grep "\"Org1MSP\": true")

# Approve for Org1 if not already approved
if [ -z "$ORG1_APPROVED" ]; then
    echo "Approving the chaincode for Org1..."
    peer lifecycle chaincode approveformyorg -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        --tls --cafile "$TEST_NETWORK_DIR/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
        --channelID "$CHANNEL_NAME" --name "$CHAINCODE_NAME" --version "$CHAINCODE_VERSION" \
        --package-id "$PACKAGE_ID" --sequence "$CHAINCODE_SEQUENCE"
else
    echo "Chaincode already approved for Org1"
fi

# Set environment variables for Org2
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/home/jquan/hackathon/godamlah/SecureShare/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/home/jquan/hackathon/godamlah/SecureShare/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

# Install chaincode for Org2 if not already installed
if ! peer lifecycle chaincode queryinstalled | grep -q "${PACKAGE_ID}"; then
    echo "Installing the chaincode package for Org2..."
    peer lifecycle chaincode install "$CHAINCODE_PACKAGE"
fi

# Check if Org2 has already approved
ORG2_APPROVED=$(echo "$APPROVE_STATUS" | grep "\"Org2MSP\": true")

# Approve for Org2 if not already approved
if [ -z "$ORG2_APPROVED" ]; then
    echo "Approving the chaincode for Org2..."
    peer lifecycle chaincode approveformyorg -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        --tls --cafile "$TEST_NETWORK_DIR/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
        --channelID "$CHANNEL_NAME" --name "$CHAINCODE_NAME" --version "$CHAINCODE_VERSION" \
        --package-id "$PACKAGE_ID" --sequence "$CHAINCODE_SEQUENCE"
else
    echo "Chaincode already approved for Org2"
fi

# Switch back to Org1 for commit
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/home/jquan/hackathon/godamlah/SecureShare/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/home/jquan/hackathon/godamlah/SecureShare/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# Check if both organizations have approved
if [ -n "$ORG1_APPROVED" ] && [ -n "$ORG2_APPROVED" ]; then
    echo "Both organizations have already approved the chaincode"
fi

# Commit the chaincode
echo "Committing the chaincode..."
peer lifecycle chaincode commit -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls --cafile "$TEST_NETWORK_DIR/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
    --channelID "$CHANNEL_NAME" --name "$CHAINCODE_NAME" --version "$CHAINCODE_VERSION" \
    --sequence "$CHAINCODE_SEQUENCE" \
    --peerAddresses localhost:7051 \
    --tlsRootCertFiles "$TEST_NETWORK_DIR/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
    --peerAddresses localhost:9051 \
    --tlsRootCertFiles "$TEST_NETWORK_DIR/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"

# Verify chaincode deployment
echo "Verifying chaincode deployment..."
peer lifecycle chaincode querycommitted --channelID "$CHANNEL_NAME" --name "$CHAINCODE_NAME"