// encrypt file

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const algorithm = 'aes-256-cbc';
const keyLength = 32; // 256 bits
const ivLength = 16; // 128 bits

function generateEncryptionKey() {
    return crypto.randomBytes(keyLength).toString('hex');
}

export const encryptFile = (filePath) => {
    return new Promise((resolve, reject) => {
        const encryptionKey = generateEncryptionKey();
        const iv = crypto.randomBytes(ivLength);

        const cipher = crypto.createCipheriv(algorithm, Buffer.from(encryptionKey, 'hex'), iv);

        const encryptedFilePath = `${filePath}.enc`;

        const input = fs.createReadStream(filePath);
        const output = fs.createWriteStream(encryptedFilePath);

        input.pipe(cipher).pipe(output);

        output.on('finish', () => {
            const encryptedData = fs.readFileSync(encryptedFilePath);
            const combinedData = Buffer.concat([iv, encryptedData]);
            fs.writeFileSync(encryptedFilePath, combinedData);
            resolve({ encryptedFilePath, encryptionKey });
        });

        output.on('error', (err) => {
            reject(err);
        });
    });
};

export const decryptFile = (encryptedBuffer, encryptionKey) => {
    return new Promise((resolve, reject) => {
        try {
            const iv = encryptedBuffer.slice(0, ivLength);
            const encryptedData = encryptedBuffer.slice(ivLength);

            const decipher = crypto.createDecipheriv(algorithm, Buffer.from(encryptionKey, 'hex'), iv);
            const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

            resolve(decrypted);
        } catch (err) {
            reject(err);
        }
    });
};
