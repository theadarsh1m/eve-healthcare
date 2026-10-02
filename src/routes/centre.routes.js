const express = require('express');
const {
  createCentre,
  getCentres,
  getCentreById,
  addTestToCentre,
} = require('../controllers/centre.controller');
const {
  createCentreSchema,
  addTestToCentreSchema,
} = require('../validators/centre.validator');
const validate = require('../middlewares/validate.middleware');
const authenticate = require('../middlewares/auth.middleware');

const router = express.Router();

// Public routes
router.get('/', getCentres);
router.get('/:id', getCentreById);

// Protected routes (require valid JWT)
router.post('/', authenticate, validate(createCentreSchema), createCentre);
router.post('/:id/tests', authenticate, validate(addTestToCentreSchema), addTestToCentre);

module.exports = router;
