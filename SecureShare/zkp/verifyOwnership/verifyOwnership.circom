// SecureShare/zkp/verifyOwnership/verifyOwnership.circom

pragma circom 2.2.1;

template VerifyOwnership() {
    // Private input: userID (as integer)
    signal input userID;

    // Public input: storedOwnerID (as integer)
    signal input storedOwnerID;

    // Constraint: userID == storedOwnerID
    userID === storedOwnerID;
}

component main = VerifyOwnership();
