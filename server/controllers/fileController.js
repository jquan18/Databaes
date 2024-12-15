// server/controllers/fileController.js

import fs from 'fs';
import path from 'path';
import { getDB } from '../services/db.js';
import { createFileAsset, getAllFileAssets, readFileAsset } from '../services/fabricService.js'; // Ensure these functions are correctly implemented
import { encryptFile, decryptFile } from '../services/encryptionService.js'; // Ensure these functions are correctly implemented
import { splitSecret, combineShares } from '../../secret-sharing/shamir.js';
import { v4 as uuidv4 } from 'uuid';
import { getIpfsClient } from '../services/ipfsService.js'; // Ensure this is correctly implemented

export async function uploadFile(req, res) {
    try {
        const file = req.file;
        const { organization, userId } = req.user;

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Step 1: Encrypt the file
        const { encryptedFilePath, encryptionKey } = await encryptFile(file.path);

        // Step 2: Split the encryption key using Shamir Secret Sharing
        const totalShares = parseInt(process.env.SSS_TOTAL_SHARES) || 5;
        const threshold = parseInt(process.env.SSS_THRESHOLD) || 3;
        const shares = splitSecret(encryptionKey, totalShares, threshold);

        // Step 3: Upload encrypted file to IPFS
        const ipfs = await getIpfsClient();
        const encryptedFileBuffer = fs.readFileSync(encryptedFilePath);
        const ipfsResult = await ipfs.add(encryptedFileBuffer);
        const ipfsCID = ipfsResult.cid.toString();

        // Step 4: Store metadata on Hyperledger Fabric
        const fileId = uuidv4();
        const metadata = {
            fileId,
            fileName: file.originalname,
            mimeType: file.mimetype,
            ipfsCID,
            ownerId: userId,
            organization,
            accessUserList: JSON.stringify({ [userId]: true }), // Initialize with uploader
            createDateTime: new Date().toISOString(),
            version: 1
        };

        // Store the encrypted key shares
        const sharedKey = JSON.stringify(shares);

        await createFileAsset(metadata, sharedKey);

        // Clean up temp files
        fs.unlinkSync(file.path);
        fs.unlinkSync(encryptedFilePath);

        res.status(201).json({ fileId, ipfsCID });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'File upload failed' });
    }
}

export async function getAllFiles(req, res) {
    try {
        const userId = req.user.userId;
        const allFiles = await getAllFileAssets();

        // Filter files based on user access
        const accessibleFiles = allFiles.filter(file => {
            const accessUserList = JSON.parse(file.Record.accessUserList);
            return accessUserList[userId];
        });

        res.json(accessibleFiles);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to retrieve files' });
    }
}

export async function getFile(req, res) {
    try {
        const { fileId } = req.params;
        const user = req.user;

        // Retrieve metadata from Hyperledger Fabric
        const fileAsset = await readFileAsset(fileId);

        // Check if user is authorized
        const accessUserList = JSON.parse(fileAsset.Record.accessUserList);
        if (!accessUserList[user.userId]) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const ipfsCID = fileAsset.Record.ipfsCID;
        const encryptedKeyShares = JSON.parse(fileAsset.Record.sharedKey);

        // Fetch encrypted file from IPFS
        const ipfs = await getIpfsClient();
        const asyncIterable = ipfs.cat(ipfsCID);
        let data = [];

        for await (const chunk of asyncIterable) {
            data.push(chunk);
        }

        const encryptedFileBuffer = Buffer.concat(data);

        // Decrypt the file
        const { shares } = req.body; // Array of shares

        if (!shares || shares.length < parseInt(process.env.SSS_THRESHOLD)) {
            return res.status(400).json({ message: 'Insufficient shares provided' });
        }

        const encryptionKey = combineShares(shares);

        const decryptedFileBuffer = await decryptFile(encryptedFileBuffer, encryptionKey);

        // Send decrypted file
        res.setHeader('Content-Disposition', `attachment; filename=${fileAsset.Record.fileName}`);
        res.setHeader('Content-Type', fileAsset.Record.mimeType);
        res.send(decryptedFileBuffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'File retrieval failed' });
    }
}
