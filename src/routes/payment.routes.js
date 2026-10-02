const express = require('express');
const { processPayment, handleWebhook } = require('../controllers/payment.controller');
const { processPaymentSchema, paymentWebhookSchema } = require('../validators/payment.validator');
const validate = require('../middlewares/validate.middleware');
const authenticate = require('../middlewares/auth.middleware');

const router = express.Router();

// 1. Webhook endpoint (Public / Provider-to-server, does NOT require JWT authentication)
router.post('/webhook', validate(paymentWebhookSchema), handleWebhook);

// 2. Protected endpoints (Require valid user JWT)
router.use(authenticate);

router.post('/', validate(processPaymentSchema), processPayment);

module.exports = router;
