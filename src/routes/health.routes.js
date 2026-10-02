const express = require('express');
const { getHealth } = require('../controllers/health.controller');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint to verify service uptime
 * @access  Public
 */
router.get('/', getHealth);

module.exports = router;
