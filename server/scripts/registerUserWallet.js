import { Wallets } from 'fabric-network';
import FabricCAServices from 'fabric-ca-client';
import fs from 'fs/promises'; // Using fs.promises for async file reading
import path from 'path';
import { fileURLToPath } from 'url';

// To use __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function registerUserWallet(username) {
    try {
        // Load the network configuration
        const ccpPath = path.resolve(__dirname, '..', 'network', 'connection.json');
        const ccp = JSON.parse(await fs.readFile(ccpPath, 'utf8')); // Read asynchronously

        // Create a new CA client for interacting with the CA.
        const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
        const ca = new FabricCAServices(caURL);

        // Create a new file system based wallet for managing identities.
        const walletPath = path.resolve(__dirname, '..', '..', 'server', 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const userIdentity = await wallet.get(username);
        if (userIdentity) {
            console.log(`An identity for the user "${username}" already exists in the wallet`);
            return false; // User already exists
        }

        // Check to see if we've already enrolled the admin user.
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            console.log('An identity for the admin user "admin" does not exist in the wallet');
            console.log('Run the enrollAdmin.js script before retrying');
            return false;
        }

        // Build a user object for authenticating with the CA
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        // Register the user, enroll the user, and import the new identity into the wallet.
        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: username,
            role: 'client'
        }, adminUser);

        const enrollment = await ca.enroll({
            enrollmentID: username,
            enrollmentSecret: secret
        });

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        await wallet.put(username, x509Identity);
        console.log(`Successfully registered and enrolled user "${username}" and imported it into the wallet`);
        return true;

    } catch (error) {
        console.error(`Failed to register user "${username}": ${error}`);
        return false;
    }
}
