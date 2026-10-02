const { z } = require('zod');

// Schema for simulated payment processing
const processPaymentSchema = z.object({
  bookingId: z.string().trim().min(1, 'Booking ID is required'),
  result: z.enum(['SUCCESS', 'FAILED'], {
    errorMap: () => ({ message: "Result must be either 'SUCCESS' or 'FAILED'" }),
  }),
});

// Schema for payment webhook
const paymentWebhookSchema = z.object({
  eventId: z.string().trim().min(1, 'Event ID is required'),
  paymentId: z.string().trim().min(1, 'Payment ID is required'),
  bookingId: z.string().trim().min(1, 'Booking ID is required'),
  status: z.enum(['SUCCESS', 'FAILED'], {
    errorMap: () => ({ message: "Status must be either 'SUCCESS' or 'FAILED'" }),
  }),
});

module.exports = {
  processPaymentSchema,
  paymentWebhookSchema,
};
