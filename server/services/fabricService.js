// to connect fabruic

import { Gateway, Wallets } from 'fabric-network';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function getGateway() {
    const ccpPath = path.resolve(__dirname, '../../', process.env.FABRIC_CONNECTION_PATH);
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: 'User1', // Replace with the appropriate identity
        discovery: { enabled: true, asLocalhost: true }
    });

    return gateway;
}

export const createFileAsset = async (metadata, sharedKey) => {
    const gateway = await getGateway();
    const network = await gateway.getNetwork('secureDocChannel');
    const contract = network.getContract('securedoccc');

    await contract.submitTransaction(
        'CreateFileAsset',
        metadata.fileId,
        metadata.fileName,
        metadata.mimeType,
        metadata.ipfsCID,
        sharedKey,
        metadata.ownerId,
        metadata.accessUserList,
        metadata.createDateTime
    );

    await gateway.disconnect();
};

export const readFileAsset = async (fileId) => {
    const gateway = await getGateway();
    const network = await gateway.getNetwork('secureDocChannel');
    const contract = network.getContract('securedoccc');

    const result = await contract.evaluateTransaction('ReadFileAsset', fileId);
    await gateway.disconnect();

    return JSON.parse(result.toString());
};

export const getAllFileAssets = async () => {
    const gateway = await getGateway();
    const network = await gateway.getNetwork('secureDocChannel');
    const contract = network.getContract('securedoccc');

    const result = await contract.evaluateTransaction('GetAllFileAssets');
    await gateway.disconnect();

    return JSON.parse(result.toString());
};
