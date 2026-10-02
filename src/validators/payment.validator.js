const { z } = require('zod');

// Schema for simulated payment processing
const processPaymentSchema = z.object({
  bookingId: z.string().trim().min(1, 'Booking ID is required'),
  result: z.enum(['SUCCESS', 'FAILED'], {
    errorMap: () => ({ message: "Result must be either 'SUCCESS' or 'FAILED'" }),
  }),
});

module.exports = {
  processPaymentSchema,
};
