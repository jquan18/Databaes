// using lowdb

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

let dbInstance = null;

export async function getDB() {
    if (dbInstance) {
        return dbInstance;
    }

    // Define the path to the JSON file
    const file = path.join('/home/jquan/hackathon/godamlah/SecureShare2/server/data/db.json');

    // Ensure the data directory exists
    const dataDir = path.dirname(file);
    if (!fs.existsSync(dataDir)) {
        console.log('Creating data directory:', dataDir);
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize Lowdb
    const adapter = new JSONFile(file);
    const db = new Low(adapter);

    // Log before reading the file
    console.log('Reading DB from:', file);

    await db.read();

    // Log the content of db.data after reading
    console.log('DB data after read:', db.data);

    // Set default data if db.data is empty or undefined
    if (!db.data || Object.keys(db.data).length === 0) {
        console.log('Initializing db with default data');
        db.data = { users: [] };
        await db.write();  // Ensure data is written to the file
    } else {
        console.log('DB already has data');
    }

    // Log the data after setting default
    console.log('DB data after setting default:', db.data);

    dbInstance = db;
    return dbInstance;
}
