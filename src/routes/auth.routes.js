const express = require('express');
const { signup, login, getMe } = require('../controllers/auth.controller');
const { signupSchema, loginSchema, validate } = require('../validators/auth.validator');
const authenticate = require('../middlewares/auth.middleware');

const router = express.Router();

// Public routes
router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);

// Protected routes
router.get('/me', authenticate, getMe);

module.exports = router;
