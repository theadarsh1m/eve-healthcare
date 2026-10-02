const { z } = require('zod');

// Schema for creating a diagnostic centre
const createCentreSchema = z.object({
  name: z.string().trim().min(1, 'Centre name is required'),
  location: z.string().trim().min(1, 'Location is required'),
});

// Schema for associating a diagnostic test with a centre
const addTestToCentreSchema = z.object({
  testId: z.string().trim().min(1, 'Test ID is required'),
  price: z.coerce.number().positive('Price must be a positive number'),
});

module.exports = {
  createCentreSchema,
  addTestToCentreSchema,
};
