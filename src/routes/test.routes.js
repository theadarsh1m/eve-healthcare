const express = require('express');
const {
  createTest,
  getTests,
  getTestById,
} = require('../controllers/test.controller');
const { createTestSchema } = require('../validators/test.validator');
const validate = require('../middlewares/validate.middleware');
const authenticate = require('../middlewares/auth.middleware');

const router = express.Router();

// Public routes
router.get('/', getTests);
router.get('/:id', getTestById);

// Protected routes (require valid JWT)
router.post('/', authenticate, validate(createTestSchema), createTest);

module.exports = router;
