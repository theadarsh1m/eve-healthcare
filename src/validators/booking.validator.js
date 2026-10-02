const { z } = require('zod');

// Schema for creating a booking
const createBookingSchema = z.object({
  centreTestId: z.string().trim().min(1, 'Centre test ID is required'),
  appointmentAt: z
    .string()
    .trim()
    .min(1, 'Appointment date/time is required')
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid appointment date format',
    }),
});

module.exports = {
  createBookingSchema,
};
