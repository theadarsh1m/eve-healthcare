const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/health', healthRoutes);

// 404 Handler for undefined routes
app.use(notFoundHandler);

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
