package com.example.secureshare;

import org.hyperledger.fabric.shim.ChaincodeBase;
import org.hyperledger.fabric.shim.ChaincodeStub;
import org.hyperledger.fabric.shim.ledger.CompositeKey;
import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class SecureShareChaincode extends ChaincodeBase {

    @Override
    public Response init(ChaincodeStub stub) {
        return newSuccessResponse("SecureShareChaincode initialized.");
    }

    @Override
    public Response invoke(ChaincodeStub stub) {
        try {
            String function = stub.getFunction();
            List<String> args = stub.getParameters();

            switch (function) {
                case "CreateUser":
                    return createUser(stub, args);  
                case "CreateNewDirectory":
                    return createNewDirectory(stub, args);
                case "UpdateDirectory":
                    return updateDirectory(stub, args);
                case "DeleteDirectory":
                    return deleteDirectory(stub, args);
                case "CreateNewPrivateDirectory":
                    return createNewPrivateDirectory(stub, args);
                case "UpdatePrivateDirectory":
                    return updatePrivateDirectory(stub, args);
                case "DeletePrivateDirectory":
                    return deletePrivateDirectory(stub, args);
                case "UpdateCooperator":
                    return updateCooperator(stub, args);
                case "UpdateDownload":
                    return updateDownload(stub, args);
                case "UpdateUpload":
                    return updateUpload(stub, args);
                case "CreateUploader":
                    return createUploader(stub, args);
                case "VerifyDownload":
                    return verifyDownload(stub, args);
                default:
                    return newErrorResponse("Invalid function name.");
            }
        } catch (Exception e) {
            return newErrorResponse(e.getMessage());
        }
    }

    // CreateUser Function
    public Response createUser(ChaincodeStub stub, List<String> args) {
        if (args.size() != 4) {
            return newErrorResponse("Incorrect number of arguments. Expecting 4: userId, name, hashedPassword, msp");
        }

        String userId = args.get(0);
        String name = args.get(1);
        String hashedPassword = args.get(2);
        String msp = args.get(3);

        // Check if user already exists
        String existingUser = stub.getStringState(userId);
        if (existingUser != null && !existingUser.isEmpty()) {
            return newErrorResponse("User with the given ID already exists.");
        }

        // Create user JSON object
        JSONObject user = new JSONObject();
        user.put("Id", userId);
        user.put("Name", name);
        user.put("HashedPassword", hashedPassword);
        user.put("Msp", msp);
        user.put("Privileges", new JSONArray()); // Optional: Add default privileges

        // Store user data
        stub.putStringState(userId, user.toString());

        return newSuccessResponse("User created successfully.");
    }


    // Helper method to get the caller's user ID from the stub
    private String getCallerUserId(ChaincodeStub stub) {
        String creator = stub.getCreator().toString();
        // Extract user ID from the creator identity (implementation depends on identity format)
        // Placeholder implementation:
        // Assume the creator string contains the user ID in a specific format
        // Example: "UserID: user123, ..."
        if (creator.contains("UserID:")) {
            int start = creator.indexOf("UserID:") + 7;
            int end = creator.indexOf(",", start);
            if (end == -1) end = creator.length();
            return creator.substring(start, end).trim();
        }
        return null;
    }

    // Helper method to check user privileges
    private boolean checkUserPrivilege(ChaincodeStub stub, String userId, String privilege) {
        String userJSON = stub.getStringState(userId);
        if (userJSON == null || userJSON.isEmpty()) {
            return false;
        }
        JSONObject user = new JSONObject(userJSON);
        JSONArray privileges = user.getJSONArray("privileges");
        for (int i = 0; i < privileges.length(); i++) {
            if (privileges.getString(i).equalsIgnoreCase(privilege)) {
                return true;
            }
        }
        return false;
    }

    // 1. CreateNewDirectory
    public Response createNewDirectory(ChaincodeStub stub, List<String> args) {
        if (args.size() != 2) {
            return newErrorResponse("Incorrect number of arguments. Expecting 2: dataMetadata (JSON), key");
        }

        String dataMetadata = args.get(0);
        String key = args.get(1);

        String userId = getCallerUserId(stub);
        if (userId == null) {
            return newErrorResponse("Authentication failed.");
        }

        // Check if user has upload privileges
        boolean hasUploadPrivilege = checkUserPrivilege(stub, userId, "uploader");
        if (!hasUploadPrivilege) {
            return newErrorResponse("User does not have upload privileges.");
        }

        // Check if key already exists
        String existing = stub.getStringState(key);
        if (existing != null && !existing.isEmpty()) {
            return newErrorResponse("Data directory with the given key already exists.");
        }

        JSONObject dataDir = new JSONObject(dataMetadata);
        dataDir.put("Key", key);
        dataDir.put("Owner", userId);
        dataDir.put("Uptime", String.valueOf(System.currentTimeMillis()));
        dataDir.put("Cooperator", new JSONArray());
        dataDir.put("Uploader", new JSONArray());
        dataDir.put("Downloader", new JSONArray());
        dataDir.put("CID", ""); // To be set after IPFS upload
        dataDir.put("VerificationStatus", ""); // To be set after ZKP verification

        stub.putStringState(key, dataDir.toString());

        return newSuccessResponse("Data directory created successfully.");
    }

    // 2. UpdateDirectory
    public Response updateDirectory(ChaincodeStub stub, List<String> args) {
        if (args.size() != 2) {
            return newErrorResponse("Incorrect number of arguments. Expecting 2: key, updatedDataMetadata (JSON)");
        }

        String key = args.get(0);
        String updatedDataMetadata = args.get(1);

        String userId = getCallerUserId(stub);
        if (userId == null) {
            return newErrorResponse("Authentication failed.");
        }

        String existing = stub.getStringState(key);
        if (existing == null || existing.isEmpty()) {
            return newErrorResponse("Data directory not found.");
        }

        JSONObject dataDir = new JSONObject(existing);

        // Check if user has cooperator privileges
        boolean hasCooperatorPrivilege = false;
        JSONArray cooperators = dataDir.getJSONArray("Cooperator");
        for (int i = 0; i < cooperators.length(); i++) {
            if (cooperators.getString(i).equalsIgnoreCase(userId)) {
                hasCooperatorPrivilege = true;
                break;
            }
        }

        if (!hasCooperatorPrivilege) {
            return newErrorResponse("User does not have cooperator privileges.");
        }

        JSONObject updatedData = new JSONObject(updatedDataMetadata);
        dataDir.put("Description", updatedData.optString("Description", dataDir.getString("Description")));
        dataDir.put("AccessPolicy", updatedData.optJSONArray("AccessPolicy") != null ? updatedData.getJSONArray("AccessPolicy") : dataDir.getJSONArray("AccessPolicy"));

        stub.putStringState(key, dataDir.toString());

        return newSuccessResponse("Data directory updated successfully.");
    }

    // 3. DeleteDirectory
    public Response deleteDirectory(ChaincodeStub stub, List<String> args) {
        if (args.size() != 1) {
            return newErrorResponse("Incorrect number of arguments. Expecting 1: key");
        }

        String key = args.get(0);

        String userId = getCallerUserId(stub);
        if (userId == null) {
            return newErrorResponse("Authentication failed.");
        }

        String existing = stub.getStringState(key);
        if (existing == null || existing.isEmpty()) {
            return newErrorResponse("Data directory not found.");
        }

        JSONObject dataDir = new JSONObject(existing);

        // Check if user has cooperator privileges
        boolean hasCooperatorPrivilege = false;
        JSONArray cooperators = dataDir.getJSONArray("Cooperator");
        for (int i = 0; i < cooperators.length(); i++) {
            if (cooperators.getString(i).equalsIgnoreCase(userId)) {
                hasCooperatorPrivilege = true;
                break;
            }
        }

        if (!hasCooperatorPrivilege) {
            return newErrorResponse("User does not have cooperator privileges.");
        }

        stub.delState(key);

        return newSuccessResponse("Data directory deleted successfully.");
    }

    // 4. CreateNewPrivateDirectory
    public Response createNewPrivateDirectory(ChaincodeStub stub, List<String> args) {
        if (args.size() != 3) {
            return newErrorResponse("Incorrect number of arguments. Expecting 3: dataMetadata (JSON), groupName, key");
        }

        String dataMetadata = args.get(0);
        String groupName = args.get(1);
        String key = args.get(2);

        String userId = getCallerUserId(stub);
        if (userId == null) {
            return newErrorResponse("Authentication failed.");
        }

        // Check if user has upload privileges
        boolean hasUploadPrivilege = checkUserPrivilege(stub, userId, "uploader");
        if (!hasUploadPrivilege) {
            return newErrorResponse("User does not have upload privileges.");
        }

        // Check if key already exists in private data
        String existing = stub.getPrivateData(groupName, key).toString();
        if (existing != null && !existing.isEmpty()) {
            return newErrorResponse("Private data directory with the given key already exists.");
        }

        JSONObject dataDir = new JSONObject(dataMetadata);
        dataDir.put("Key", key);
        dataDir.put("Owner", userId);
        dataDir.put("Uptime", String.valueOf(System.currentTimeMillis()));
        dataDir.put("Cooperator", new JSONArray());
        dataDir.put("Uploader", new JSONArray());
        dataDir.put("Downloader", new JSONArray());
        dataDir.put("CID", ""); // To be set after IPFS upload
        dataDir.put("VerificationStatus", ""); // To be set after ZKP verification

        stub.putPrivateData(groupName, key, dataDir.toString().getBytes(StandardCharsets.UTF_8));

        return newSuccessResponse("Private data directory created successfully.");
    }

    // 5. UpdatePrivateDirectory
    public Response updatePrivateDirectory(ChaincodeStub stub, List<String> args) {
        if (args.size() != 3) {
            return newErrorResponse("Incorrect number of arguments. Expecting 3: key, updatedDataMetadata (JSON), groupName");
        }

        String key = args.get(0);
        String updatedDataMetadata = args.get(1);
        String groupName = args.get(2);

        String userId = getCallerUserId(stub);
        if (userId == null) {
            return newErrorResponse("Authentication failed.");
        }

        String existing = stub.getPrivateData(groupName, key).toString();
        if (existing == null || existing.isEmpty()) {
            return newErrorResponse("Private data directory not found.");
        }

        JSONObject dataDir = new JSONObject(existing);

        // Check if user has cooperator privileges
        boolean hasCooperatorPrivilege = false;
        JSONArray cooperators = dataDir.getJSONArray("Cooperator");
        for (int i = 0; i < cooperators.length(); i++) {
            if (cooperators.getString(i).equalsIgnoreCase(userId)) {
                hasCooperatorPrivilege = true;
                break;
            }
        }

        if (!hasCooperatorPrivilege) {
            return newErrorResponse("User does not have cooperator privileges.");
        }

        JSONObject updatedData = new JSONObject(updatedDataMetadata);
        dataDir.put("Description", updatedData.optString("Description", dataDir.getString("Description")));
        dataDir.put("AccessPolicy", updatedData.optJSONArray("AccessPolicy") != null ? updatedData.getJSONArray("AccessPolicy") : dataDir.getJSONArray("AccessPolicy"));

        stub.putPrivateData(groupName, key, dataDir.toString().getBytes(StandardCharsets.UTF_8));

        return newSuccessResponse("Private data directory updated successfully.");
    }

    // 6. DeletePrivateDirectory
    public Response deletePrivateDirectory(ChaincodeStub stub, List<String> args) {
        if (args.size() != 2) {
            return newErrorResponse("Incorrect number of arguments. Expecting 2: key, groupName");
        }

        String key = args.get(0);
        String groupName = args.get(1);

        String userId = getCallerUserId(stub);
        if (userId == null) {
            return newErrorResponse("Authentication failed.");
        }

        String existing = stub.getPrivateData(groupName, key).toString();
        if (existing == null || existing.isEmpty()) {
            return newErrorResponse("Private data directory not found.");
        }

        JSONObject dataDir = new JSONObject(existing);

        // Check if user has cooperator privileges
        boolean hasCooperatorPrivilege = false;
        JSONArray cooperators = dataDir.getJSONArray("Cooperator");
        for (int i = 0; i < cooperators.length(); i++) {
            if (cooperators.getString(i).equalsIgnoreCase(userId)) {
                hasCooperatorPrivilege = true;
                break;
            }
        }

        if (!hasCooperatorPrivilege) {
            return newErrorResponse("User does not have cooperator privileges.");
        }

        stub.delPrivateData(groupName, key);

        return newSuccessResponse("Private data directory deleted successfully.");
    }

    // 7. UpdateCooperator
    public Response updateCooperator(ChaincodeStub stub, List<String> args) {
        if (args.size() != 3) {
            return newErrorResponse("Incorrect number of arguments. Expecting 3: key, cooperatorId, groupName");
        }

        String key = args.get(0);
        String cooperatorId = args.get(1);
        String groupName = args.get(2);

        String userId = getCallerUserId(stub);
        if (userId == null) {
            return newErrorResponse("Authentication failed.");
        }

        String existing = stub.getPrivateData(groupName, key).toString();
        if (existing == null || existing.isEmpty()) {
            return newErrorResponse("Private data directory not found.");
        }

        JSONObject dataDir = new JSONObject(existing);

        // Check if user has permission to update cooperators
        boolean isUploader = false;
        JSONArray uploaders = dataDir.getJSONArray("Uploader");
        for (int i = 0; i < uploaders.length(); i++) {
            if (uploaders.getString(i).equalsIgnoreCase(userId)) {
                isUploader = true;
                break;
            }
        }

        if (!isUploader) {
            return newErrorResponse("User does not have permission to update cooperators.");
        }

        JSONArray cooperators = dataDir.getJSONArray("Cooperator");
        if (!cooperators.toList().contains(cooperatorId)) {
            cooperators.put(cooperatorId);
            dataDir.put("Cooperator", cooperators);
            stub.putPrivateData(groupName, key, dataDir.toString().getBytes(StandardCharsets.UTF_8));
            return newSuccessResponse("Cooperator added successfully.");
        } else {
            return newErrorResponse("Cooperator already exists.");
        }
    }

    // 8. UpdateDownload
    public Response updateDownload(ChaincodeStub stub, List<String> args) {
        if (args.size() != 3) {
            return newErrorResponse("Incorrect number of arguments. Expecting 3: key, downloaderId, groupName");
        }

        String key = args.get(0);
        String downloaderId = args.get(1);
        String groupName = args.get(2);

        String userId = getCallerUserId(stub);
        if (userId == null) {
            return newErrorResponse("Authentication failed.");
        }

        String existing = stub.getPrivateData(groupName, key).toString();
        if (existing == null || existing.isEmpty()) {
            return newErrorResponse("Private data directory not found.");
        }

        JSONObject dataDir = new JSONObject(existing);

        // Check if user has permission to update downloaders
        boolean isUploader = false;
        JSONArray uploaders = dataDir.getJSONArray("Uploader");
        for (int i = 0; i < uploaders.length(); i++) {
            if (uploaders.getString(i).equalsIgnoreCase(userId)) {
                isUploader = true;
                break;
            }
        }

        if (!isUploader) {
            return newErrorResponse("User does not have permission to update downloaders.");
        }

        JSONArray downloaders = dataDir.getJSONArray("Downloader");
        if (!downloaders.toList().contains(downloaderId)) {
            downloaders.put(downloaderId);
            dataDir.put("Downloader", downloaders);
            stub.putPrivateData(groupName, key, dataDir.toString().getBytes(StandardCharsets.UTF_8));
            return newSuccessResponse("Downloader added successfully.");
        } else {
            return newErrorResponse("Downloader already exists.");
        }
    }

    // 9. UpdateUpload
    public Response updateUpload(ChaincodeStub stub, List<String> args) {
        if (args.size() != 3) {
            return newErrorResponse("Incorrect number of arguments. Expecting 3: key, uploaderId, groupName");
        }

        String key = args.get(0);
        String uploaderId = args.get(1);
        String groupName = args.get(2);

        String userId = getCallerUserId(stub);
        if (userId == null) {
            return newErrorResponse("Authentication failed.");
        }

        String existing = stub.getPrivateData(groupName, key).toString();
        if (existing == null || existing.isEmpty()) {
            return newErrorResponse("Private data directory not found.");
        }

        JSONObject dataDir = new JSONObject(existing);

        // Check if user has permission to update uploaders
        boolean isUploader = false;
        JSONArray uploaders = dataDir.getJSONArray("Uploader");
        for (int i = 0; i < uploaders.length(); i++) {
            if (uploaders.getString(i).equalsIgnoreCase(userId)) {
                isUploader = true;
                break;
            }
        }

        if (!isUploader) {
            return newErrorResponse("User does not have permission to update uploaders.");
        }

        JSONArray uploadersArray = dataDir.getJSONArray("Uploader");
        if (!uploadersArray.toList().contains(uploaderId)) {
            uploadersArray.put(uploaderId);
            dataDir.put("Uploader", uploadersArray);
            stub.putPrivateData(groupName, key, dataDir.toString().getBytes(StandardCharsets.UTF_8));
            return newSuccessResponse("Uploader added successfully.");
        } else {
            return newErrorResponse("Uploader already exists.");
        }
    }

    // 10. CreateUploader
    public Response createUploader(ChaincodeStub stub, List<String> args) {
        if (args.size() != 1) {
            return newErrorResponse("Incorrect number of arguments. Expecting 1: uploaderId");
        }

        String uploaderId = args.get(0);

        String userId = getCallerUserId(stub);
        if (userId == null) {
            return newErrorResponse("Authentication failed.");
        }

        // Check if user has permission to create uploader
        boolean isAdmin = checkUserPrivilege(stub, userId, "admin");
        if (!isAdmin) {
            return newErrorResponse("User does not have admin privileges.");
        }

        String existing = stub.getStringState(uploaderId);
        if (existing != null && !existing.isEmpty()) {
            return newErrorResponse("Uploader already exists.");
        }

        JSONObject uploader = new JSONObject();
        uploader.put("Id", uploaderId);
        uploader.put("Privileges", new JSONArray().put("uploader"));
        uploader.put("Msp", ""); // To be set based on group

        stub.putStringState(uploaderId, uploader.toString());

        return newSuccessResponse("Uploader created successfully.");
    }

    // 11. VerifyDownload
    public Response verifyDownload(ChaincodeStub stub, List<String> args) {
        if (args.size() != 2) {
            return newErrorResponse("Incorrect number of arguments. Expecting 2: key, downloaderId");
        }

        String key = args.get(0);
        String downloaderId = args.get(1);

        String userId = getCallerUserId(stub);
        if (userId == null) {
            return newErrorResponse("Authentication failed.");
        }

        String existing = stub.getStringState(key);
        if (existing == null || existing.isEmpty()) {
            return newErrorResponse("Data directory not found.");
        }

        JSONObject dataDir = new JSONObject(existing);

        JSONArray downloaders = dataDir.getJSONArray("Downloader");
        boolean canDownload = false;
        for (int i = 0; i < downloaders.length(); i++) {
            if (downloaders.getString(i).equalsIgnoreCase(downloaderId)) {
                canDownload = true;
                break;
            }
        }

        JSONObject response = new JSONObject();
        response.put("canDownload", canDownload);

        return newSuccessResponse(response.toString());
    }

    public static void main(String[] args) {
        new SecureShareChaincode().start(args);
    }
}
