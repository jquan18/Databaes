// server/controllers/authController.js

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDB } from '../services/db.js';
import { registerUserWallet } from '../scripts/registerUserWallet.js';
import dotenv from 'dotenv';
dotenv.config();

const SALT_ROUNDS = 10; // Number of salt rounds for bcrypt

export async function register(req, res) {
    const { username, password, organization } = req.body;

    if (!username || !password || !organization) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Get the database instance
        const dbInstance = await getDB();

        // Check if the user already exists in the database
        const existingUser = dbInstance.data.users.find(user => user.username === username);
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Register and enroll the user with Hyperledger Fabric
        const registrationSuccess = await registerUserWallet(username);

        if (!registrationSuccess) {
            return res.status(500).json({ message: 'Failed to register user with blockchain' });
        }

        // Add the user to the database
        dbInstance.data.users.push({
            username,
            hashedPassword,
            organization
        });
        await dbInstance.write();

        res.status(201).json({ message: 'User registered successfully', userId: username });
    } catch (error) {
        console.error(`Failed to register user "${username}": ${error}`);
        res.status(500).json({ message: `Registration failed: ${error.message}` });
    }
}

export async function login(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Missing username or password' });
    }

    try {
        // Get the database instance
        const dbInstance = await getDB();

        // Check if the user exists in the database
        const user = dbInstance.data.users.find(user => user.username === username);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verify the password
        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { userId: username, organization: user.organization },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token });
    } catch (error) {
        console.error(`Login failed for user "${username}": ${error}`);
        res.status(500).json({ message: 'Login failed' });
    }
}
