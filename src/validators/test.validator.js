const { z } = require('zod');

// Schema for creating a diagnostic test
const createTestSchema = z.object({
  name: z.string().trim().min(1, 'Test name is required'),
  description: z.string().trim().optional(),
});

module.exports = {
  createTestSchema,
};
