// server/routes.js

import express from 'express';
import { register, login } from './controllers/authController.js';
import { uploadFile, getAllFiles, getFile } from './controllers/fileController.js';
import { authenticateToken } from './middleware/authMiddleware.js';

const router = express.Router();

// Auth Routes
router.post('/auth/register', register);
router.post('/auth/login', login);

// File Routes (Protected)
router.post('/files/upload', authenticateToken, uploadFile);
router.get('/files', authenticateToken, getAllFiles);
router.get('/files/:fileId', authenticateToken, getFile);

export default router;
