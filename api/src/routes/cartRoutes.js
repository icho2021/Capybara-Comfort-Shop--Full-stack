const express = require("express");

const { prisma } = require("../lib/prisma");
const { getOrCreateCart } = require("../lib/cart");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

// Return the current user's cart with line items and product snapshots.
router.get("/cart", requireAuth, async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.userId);
    const items = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: { product: true },
      orderBy: { id: "asc" },
    });
    return res.json({ cart: { id: cart.id }, items });
  } catch {
    return res.status(500).json({ error: "Failed to load cart." });
  }
});

// Add or merge quantity for a product in the cart.
router.post("/cart/items", requireAuth, async (req, res) => {
  try {
    const productId = Number(req.body.productId);
    const quantity = Number(req.body.quantity);

    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({ error: "Invalid productId." });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: "quantity must be a positive integer." });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    if (product.stock < quantity) {
      return res.status(400).json({ error: "Not enough stock." });
    }

    const cart = await getOrCreateCart(req.userId);

    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    const nextQty = existing ? existing.quantity + quantity : quantity;
    if (nextQty > product.stock) {
      return res.status(400).json({ error: "Not enough stock for this quantity." });
    }

    const item = existing
      ? await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: nextQty },
          include: { product: true },
        })
      : await prisma.cartItem.create({
          data: { cartId: cart.id, productId, quantity },
          include: { product: true },
        });

    return res.status(existing ? 200 : 201).json({ item });
  } catch {
    return res.status(500).json({ error: "Failed to update cart." });
  }
});

// Update line quantity (must stay within stock).
router.put("/cart/items/:itemId", requireAuth, async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    const quantity = Number(req.body.quantity);

    if (!Number.isInteger(itemId) || itemId < 1) {
      return res.status(400).json({ error: "Invalid item id." });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: "quantity must be a positive integer." });
    }

    const cart = await getOrCreateCart(req.userId);
    const line = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { product: true },
    });

    if (!line) {
      return res.status(404).json({ error: "Cart item not found." });
    }

    if (line.product.stock < quantity) {
      return res.status(400).json({ error: "Not enough stock." });
    }

    const item = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: { product: true },
    });

    return res.json({ item });
  } catch {
    return res.status(500).json({ error: "Failed to update cart item." });
  }
});

// Remove a line from the cart.
router.delete("/cart/items/:itemId", requireAuth, async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    if (!Number.isInteger(itemId) || itemId < 1) {
      return res.status(400).json({ error: "Invalid item id." });
    }

    const cart = await getOrCreateCart(req.userId);
    const line = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!line) {
      return res.status(404).json({ error: "Cart item not found." });
    }

    await prisma.cartItem.delete({ where: { id: itemId } });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to remove cart item." });
  }
});

module.exports = router;
