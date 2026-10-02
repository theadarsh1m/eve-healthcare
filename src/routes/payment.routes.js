const express = require('express');
const { processPayment } = require('../controllers/payment.controller');
const { processPaymentSchema } = require('../validators/payment.validator');
const validate = require('../middlewares/validate.middleware');
const authenticate = require('../middlewares/auth.middleware');

const router = express.Router();

// All payment endpoints require valid JWT authentication
router.use(authenticate);

router.post('/', validate(processPaymentSchema), processPayment);

module.exports = router;
