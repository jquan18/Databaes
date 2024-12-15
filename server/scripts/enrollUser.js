'use strict';

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

/**
 * Registers and enrolls a user with the CA, then stores the identity in the wallet.
 * @param {string} username - The username of the user to register.
 */
async function registerUser(username) {
    try {
        // Validate username
        if (!username) {
            throw new Error('Username must be provided');
        }

        // Load the network configuration
        const ccpPath = path.resolve(__dirname, '..', 'network', 'connection.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new CA client for interacting with the CA.
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(
            caInfo.url,
            { trustedRoots: caTLSCACerts, verify: false },
            caInfo.caName
        );

        // Create a new file system based wallet for managing identities.
        const walletPath = path.resolve(__dirname, '..', '..', 'server', 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const userIdentity = await wallet.get(username);
        if (userIdentity) {
            console.log(`An identity for the user "${username}" already exists in the wallet`);
            return;
        }

        // Check to see if we've already enrolled the admin user.
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            console.log('An identity for the admin user "admin" does not exist in the wallet');
            console.log('Run the enrollAdmin.js script before retrying');
            return;
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

    } catch (error) {
        console.error(`Failed to register user "${username}": ${error}`);
    }
}

/**
 * Entry point of the script.
 * Expects the username as a command-line argument.
 */
async function main() {
    const args = process.argv.slice(2);
    const username = args[0];

    if (!username) {
        console.error('Usage: node enrollUser.js <username>');
        process.exit(1);
    }

    await registerUser(username);
}

main();
