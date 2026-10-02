const express = require('express');
const {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
} = require('../controllers/booking.controller');
const { createBookingSchema } = require('../validators/booking.validator');
const validate = require('../middlewares/validate.middleware');
const authenticate = require('../middlewares/auth.middleware');

const router = express.Router();

// All booking endpoints require valid JWT authentication
router.use(authenticate);

router.post('/', validate(createBookingSchema), createBooking);
router.get('/', getUserBookings);
router.get('/:id', getBookingById);
router.patch('/:id/cancel', cancelBooking);

module.exports = router;
