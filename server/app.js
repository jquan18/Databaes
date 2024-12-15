// server/app.js

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import routes from './routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Error Handling Middleware
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Secure Doc Management Server running on port ${PORT}`);
});
