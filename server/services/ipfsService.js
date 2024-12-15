// for ipfs

import path from 'path';

let ipfs = null;

async function getIpfsClient() {
    if (!ipfs) {
        const ipfsPath = path.resolve(__dirname, '../../../ipfs/ipfsClient.mjs');
        const ipfsModule = await import(ipfsPath);
        ipfs = ipfsModule.default;
    }
    return ipfs;
}

export { getIpfsClient };
