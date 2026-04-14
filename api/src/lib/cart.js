const { prisma } = require("./prisma");

// Ensure each user has exactly one cart row (Part 1 design).
async function getOrCreateCart(userId) {
  let cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId } });
  }
  return cart;
}

module.exports = { getOrCreateCart };
