// ipfsClient.mjs

import { create } from 'kubo-rpc-client';
import dotenv from 'dotenv';

dotenv.config();

// Create an instance of Kubo RPC Client
const ipfs = create({
    host: process.env.IPFS_HOST || 'localhost',
    port: process.env.IPFS_PORT || '5001',
    protocol: process.env.IPFS_PROTOCOL || 'http'
});

export default ipfs;
