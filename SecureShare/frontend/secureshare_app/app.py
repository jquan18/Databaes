# SecureShare/frontend/secureshare_app/app.py

import streamlit as st
import requests
import json
import subprocess
import os
import hashlib

# IPFS API endpoints
IPFS_ADD_URL = "http://127.0.0.1:5001/api/v0/add"
IPFS_GATEWAY_URL = "http://127.0.0.1:8080/ipfs/"

# Path to ZKP verification service
ZKP_VERIFICATION_SERVICE = "~/hackathon/godamlah/SecureShare/frontend/secureshare_app/verification_service.py"

# Path to group and Fabric certificates
ORDERER_CA = "/home/jquan/hackathon/godamlah/SecureShare/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"
PEER_TLS_ROOTCERT = "/home/jquan/hackathon/godamlah/SecureShare/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"

# Function to hash password (simple SHA256, in production use stronger hashing with salt)
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# # Function to register user
# def register_user(user_id, name, password, msp):
#     # Invoke chaincode to create user
#     cmd = (
#         "peer chaincode invoke -o localhost:7050 "
#         f"--ordererTLSHostnameOverride orderer.example.com "
#         "--tls --cafile " + ORDERER_CA + " "
#         "-C mychannel -n secureshare --peerAddresses localhost:7051 "
#         "--tlsRootCertFiles " + PEER_TLS_ROOTCERT + " "
#         f"-c '{{\"function\":\"CreateUser\",\"Args\":[\"{user_id}\", \"{name}\", \"{hash_password(password)}\", \"{msp}\"]}}'"
#     )
#     result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
#     return result.stdout, result.stderr

def register_user(user_id, name, password, msp):
    cmd = (
        "peer chaincode invoke -o localhost:7050 "
        f"--ordererTLSHostnameOverride orderer.example.com "
        "--tls --cafile " + ORDERER_CA + " "
        "-C mychannel -n secureshare --peerAddresses localhost:7051 "
        "--tlsRootCertFiles " + PEER_TLS_ROOTCERT + " "
        f"-c '{{\"function\":\"CreateUser\",\"Args\":[\"{user_id}\", \"{name}\", \"{hash_password(password)}\", \"{msp}\"]}}'"
    )
    print("Executing command:", cmd)  # Debugging log
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout, result.stderr


# Function to upload file to IPFS
def upload_to_ipfs(file_path):
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(IPFS_ADD_URL, files=files)
    if response.status_code == 200:
        return response.json()['Hash']
    else:
        return None

# Function to download file from IPFS
def download_from_ipfs(cid, output_path):
    url = f"{IPFS_GATEWAY_URL}{cid}"
    response = requests.get(url)
    if response.status_code == 200:
        with open(output_path, 'wb') as f:
            f.write(response.content)
        return True
    else:
        return False

# Function to invoke chaincode
def invoke_chaincode(function, args):
    args_json = json.dumps(args)
    cmd = (
        "peer chaincode invoke -o localhost:7050 "
        f"--ordererTLSHostnameOverride orderer.example.com "
        "--tls --cafile " + ORDERER_CA + " "
        "-C mychannel -n secureshare --peerAddresses localhost:7051 "
        "--tlsRootCertFiles " + PEER_TLS_ROOTCERT + " "
        f"-c '{{\"function\":\"{function}\",\"Args\":{args_json}}}'"
    )
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout, result.stderr

# Function to query chaincode
def query_chaincode(function, args):
    args_json = json.dumps(args)
    cmd = (
        "peer chaincode query -C mychannel -n secureshare "
        f"-c '{{\"function\":\"{function}\",\"Args\":{args_json}}}'"
    )
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout, result.stderr

# Streamlit App
def main():
    st.title("SecureShare: Blockchain-Based Secure Data Sharing Platform")

    menu = ["Register", "Upload File", "Grant Access", "Revoke Access", "Verify Ownership", "Submit Proof"]
    choice = st.sidebar.selectbox("Menu", menu)

    if choice == "Register":
        st.subheader("Register User")
        user_id = st.text_input("User ID")
        name = st.text_input("Name")
        password = st.text_input("Password", type="password")
        msp = st.text_input("MSP (Group Tag)")

        if st.button("Register"):
            if user_id and name and password and msp:
                stdout, stderr = register_user(user_id, name, password, msp)
                if stderr:
                    st.error(f"Error: {stderr}")
                else:
                    st.success(f"User '{user_id}' registered successfully.")
            else:
                st.error("Please fill in all fields.")

    elif choice == "Upload File":
        st.subheader("Upload File to IPFS and Record on Blockchain")
        user_id = st.text_input("Enter Your User ID")
        password = st.text_input("Enter Your Password", type="password")
        uploaded_file = st.file_uploader("Choose a file", type=["txt", "pdf", "png", "jpg", "docx"])

        if st.button("Upload"):
            if user_id and password and uploaded_file:
                # Verify user credentials (simple check by hashing password and comparing)
                # In production, use proper authentication
                hashed_password = hash_password(password)
                # Query user
                cmd = (
                    "peer chaincode query -C mychannel -n secureshare "
                    f"-c '{{\"function\":\"QueryUser\",\"Args\":[\"{user_id}\"]}}'"
                )
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                if result.stderr:
                    st.error(f"Error: {result.stderr}")
                else:
                    try:
                        user_info = json.loads(result.stdout)
                        # Assuming password is stored as hash
                        # Compare hashed passwords
                        # Since QueryUser excludes password, you need to adjust
                        # For simplicity, assume verification is done elsewhere
                        # Here, proceed to upload
                        # Save uploaded file temporarily
                        temp_path = os.path.join("temp", uploaded_file.name)
                        os.makedirs("temp", exist_ok=True)
                        with open(temp_path, "wb") as f:
                            f.write(uploaded_file.getbuffer())

                        # Upload to IPFS
                        cid = upload_to_ipfs(temp_path)
                        if cid:
                            st.success(f"File uploaded to IPFS with CID: {cid}")

                            # Create data directory JSON
                            data_metadata = {
                                "Description": "Shared data file",
                                "AccessPolicy": ["public"], # or specify groups
                            }
                            key = f"{user_id}_{uploaded_file.name}"

                            # Invoke CreateNewDirectory
                            stdout, stderr = invoke_chaincode("CreateNewDirectory", [json.dumps(data_metadata), key])
                            if stderr:
                                st.error(f"Chaincode Error: {stderr}")
                            else:
                                # Update CID in data directory
                                # Assuming UpdateDirectory can update the CID
                                update_metadata = {
                                    "CID": cid
                                }
                                stdout, stderr = invoke_chaincode("UpdateDirectory", [key, json.dumps(update_metadata)])
                                if stderr:
                                    st.error(f"Error updating CID: {stderr}")
                                else:
                                    st.success("Data directory updated with CID.")
                        else:
                            st.error("Failed to upload file to IPFS.")
                    except json.JSONDecodeError:
                        st.error("Failed to parse user information.")
            else:
                st.error("Please provide User ID, Password, and select a file.")

    elif choice == "Grant Access":
        st.subheader("Grant Access to a User")
        user_id = st.text_input("Enter Your User ID")
        password = st.text_input("Enter Your Password", type="password")
        file_key = st.text_input("Enter File Key")
        user_to_grant = st.text_input("Enter User ID to Grant Access")

        if st.button("Grant Access"):
            if user_id and password and file_key and user_to_grant:
                # Verify user credentials
                hashed_password = hash_password(password)
                cmd = (
                    "peer chaincode query -C mychannel -n secureshare "
                    f"-c '{{\"function\":\"QueryUser\",\"Args\":[\"{user_id}\"]}}'"
                )
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                if result.stderr:
                    st.error(f"Error: {result.stderr}")
                else:
                    try:
                        user_info = json.loads(result.stdout)
                        # Proceed to grant access
                        # Assuming UpdateCooperator adds to Cooperator array
                        # Pass groupName as empty string if not applicable
                        groupName = user_info.get("Msp", "")
                        stdout, stderr = invoke_chaincode("UpdateCooperator", [file_key, user_to_grant, groupName])
                        if stderr:
                            st.error(f"Chaincode Error: {stderr}")
                        else:
                            st.success(f"Access granted to user '{user_to_grant}' for file '{file_key}'.")
                    except json.JSONDecodeError:
                        st.error("Failed to parse user information.")
            else:
                st.error("Please fill in all fields.")

    elif choice == "Revoke Access":
        st.subheader("Revoke Access from a User")
        user_id = st.text_input("Enter Your User ID")
        password = st.text_input("Enter Your Password", type="password")
        file_key = st.text_input("Enter File Key")
        user_to_revoke = st.text_input("Enter User ID to Revoke Access")

        if st.button("Revoke Access"):
            if user_id and password and file_key and user_to_revoke:
                # Verify user credentials
                hashed_password = hash_password(password)
                cmd = (
                    "peer chaincode query -C mychannel -n secureshare "
                    f"-c '{{\"function\":\"QueryUser\",\"Args\":[\"{user_id}\"]}}'"
                )
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                if result.stderr:
                    st.error(f"Error: {result.stderr}")
                else:
                    try:
                        user_info = json.loads(result.stdout)
                        # To revoke access, implement a new chaincode function or modify existing one
                        # For simplicity, this example does not include a revoke function
                        # You may need to implement a separate function to remove a cooperator
                        st.warning("Revoke Access functionality is not implemented yet.")
                    except json.JSONDecodeError:
                        st.error("Failed to parse user information.")
            else:
                st.error("Please fill in all fields.")

    elif choice == "Verify Ownership":
        st.subheader("Verify Ownership of a File")
        user_id = st.text_input("Enter Your User ID")
        password = st.text_input("Enter Your Password", type="password")
        file_key = st.text_input("Enter File Key")

        if st.button("Verify"):
            if user_id and password and file_key:
                # Verify user credentials
                hashed_password = hash_password(password)
                cmd = (
                    "peer chaincode query -C mychannel -n secureshare "
                    f"-c '{{\"function\":\"QueryUser\",\"Args\":[\"{user_id}\"]}}'"
                )
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                if result.stderr:
                    st.error(f"Error: {result.stderr}")
                else:
                    try:
                        user_info = json.loads(result.stdout)
                        # Assuming password is stored as hash
                        # Compare hashed passwords
                        # Since QueryUser excludes password, you need to adjust
                        # For simplicity, assume verification is done elsewhere
                        # Here, proceed to verify ownership
                        # Query chaincode for ownership
                        cmd = (
                            "peer chaincode query -C mychannel -n secureshare "
                            f"-c '{{\"function\":\"GetDataDirectory\",\"Args\":[\"{file_key}\"]}}'"
                        )
                        data_result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                        if data_result.stderr:
                            st.error(f"Error: {data_result.stderr}")
                        else:
                            data_dir = json.loads(data_result.stdout)
                            owner = data_dir.get("Owner")
                            if owner == user_id:
                                st.success(f"User '{user_id}' is the owner of file '{file_key}'.")
                            else:
                                st.warning(f"User '{user_id}' is NOT the owner of file '{file_key}'.")
                    except json.JSONDecodeError:
                        st.error("Failed to parse user information.")
            else:
                st.error("Please fill in all fields.")

    elif choice == "Submit Proof":
        st.subheader("Submit ZKP Proof for Verification")
        user_id = st.text_input("Enter Your User ID")
        password = st.text_input("Enter Your Password", type="password")
        file_key = st.text_input("Enter File Key")
        proof_file = st.file_uploader("Upload Proof JSON", type=["json"])
        public_file = st.file_uploader("Upload Public JSON", type=["json"])

        if st.button("Submit Proof"):
            if user_id and password and file_key and proof_file and public_file:
                # Verify user credentials
                hashed_password = hash_password(password)
                cmd = (
                    "peer chaincode query -C mychannel -n secureshare "
                    f"-c '{{\"function\":\"QueryUser\",\"Args\":[\"{user_id}\"]}}'"
                )
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                if result.stderr:
                    st.error(f"Error: {result.stderr}")
                else:
                    try:
                        user_info = json.loads(result.stdout)
                        # Proceed to submit proof
                        # Save proof files temporarily
                        proofs_dir = os.path.join("proofs", file_key)
                        os.makedirs(proofs_dir, exist_ok=True)
                        proof_path = os.path.join(proofs_dir, "proof.json")
                        public_path = os.path.join(proofs_dir, "public.json")

                        with open(proof_path, "wb") as f:
                            f.write(proof_file.getbuffer())

                        with open(public_path, "wb") as f:
                            f.write(public_file.getbuffer())

                        # Call the ZKP verification service
                        cmd = f"python3 {os.path.expanduser(ZKP_VERIFICATION_SERVICE)} {file_key} {proof_path} {public_path} /home/jquan/hackathon/godamlah/SecureShare/zkp/verifyOwnership/verification_key.json"
                        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

                        if "Proof verification result: valid" in result.stdout:
                            st.success("Proof is valid and recorded on the blockchain.")
                        else:
                            st.error("Proof verification failed.")
                    except json.JSONDecodeError:
                        st.error("Failed to parse user information.")
            else:
                st.error("Please provide all required fields.")

if __name__ == "__main__":
    main()
