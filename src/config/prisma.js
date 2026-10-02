const { PrismaClient } = require('@prisma/client');

// Shared PrismaClient instance to manage database connection pool
const prisma = new PrismaClient();

module.exports = prisma;
