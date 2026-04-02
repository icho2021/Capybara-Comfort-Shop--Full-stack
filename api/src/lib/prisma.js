const { PrismaClient } = require("@prisma/client");

// Reuse one Prisma client instance across the API process.
const prisma = new PrismaClient();

module.exports = { prisma };
