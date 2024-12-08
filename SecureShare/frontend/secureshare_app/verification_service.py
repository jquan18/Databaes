# SecureShare/frontend/secureshare_app/verification_service.py

import subprocess
import sys
import json

def verify_proof(proof_path, public_path, verification_key_path):
    cmd = f"snarkjs groth16 verify {verification_key_path} {public_path} {proof_path}"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout, result.stderr

def record_verification(stub_command, file_id, status):
    # Construct the chaincode invoke command
    cmd = (
        f"{stub_command} -c '{{\"function\":\"RecordProofVerification\",\"Args\":[\"{file_id}\", \"{status}\"]}}'"
    )
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout, result.stderr

def main():
    if len(sys.argv) != 5:
        print("Usage: python3 verification_service.py <file_id> <proof.json> <public.json> <verification_key.json>")
        sys.exit(1)
    
    file_id = sys.argv[1]
    proof_path = sys.argv[2]
    public_path = sys.argv[3]
    verification_key_path = sys.argv[4]
    
    # Path to the 'peer' CLI, adjust if different
    stub_command = "peer chaincode invoke -o localhost:7050 " \
                   "--ordererTLSHostnameOverride orderer.example.com " \
                   "--tls --cafile /home/jquan/hackathon/godamlah/SecureShare/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem " \
                   "-C mychannel -n secureshare --peerAddresses localhost:7051 " \
                   "--tlsRootCertFiles /home/jquan/hackathon/godamlah/SecureShare/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt " \
                   "-c"

    stdout, stderr = verify_proof(proof_path, public_path, verification_key_path)
    if "OK!" in stdout:
        status = "valid"
    else:
        status = "invalid"

    print(f"Proof verification result: {status}")

    # Record the verification result on the blockchain
    stdout, stderr = record_verification(stub_command, file_id, status)
    if stderr:
        print(f"Error recording verification: {stderr}")
    else:
        print("Verification result recorded successfully.")

if __name__ == "__main__":
    main()
