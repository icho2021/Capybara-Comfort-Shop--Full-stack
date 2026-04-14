const express = require("express");

const { prisma } = require("../lib/prisma");
const { getOrCreateCart } = require("../lib/cart");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

// Place order from current cart (empties cart, decrements stock).
router.post("/orders", requireAuth, async (req, res) => {
  try {
    const shippingAddress =
      typeof req.body.shippingAddress === "string" ? req.body.shippingAddress.trim() : "";

    if (shippingAddress.length < 5) {
      return res.status(400).json({ error: "shippingAddress must be at least 5 characters." });
    }

    const cart = await getOrCreateCart(req.userId);
    const lines = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: { product: true },
    });

    if (lines.length === 0) {
      return res.status(400).json({ error: "Cart is empty." });
    }

    const order = await prisma.$transaction(async (tx) => {
      let total = 0;
      for (const line of lines) {
        if (line.product.stock < line.quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${line.product.title}`);
        }
        total += line.product.price * line.quantity;
      }

      const created = await tx.order.create({
        data: {
          userId: req.userId,
          status: "pending",
          totalAmount: total,
          shippingAddress,
        },
      });

      for (const line of lines) {
        await tx.orderItem.create({
          data: {
            orderId: created.id,
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.product.price,
          },
        });
        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { decrement: line.quantity } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    const full = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: { include: { product: true } }, user: { select: { id: true, name: true, email: true } } },
    });

    return res.status(201).json({ order: full });
  } catch (err) {
    if (typeof err.message === "string" && err.message.startsWith("INSUFFICIENT_STOCK:")) {
      return res.status(400).json({ error: "Not enough stock for one or more items." });
    }
    return res.status(500).json({ error: "Failed to create order." });
  }
});

// List orders: users see own; admin sees all.
router.get("/orders", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const where = user.role === "admin" ? {} : { userId: req.userId };

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return res.json({ orders });
  } catch {
    return res.status(500).json({ error: "Failed to list orders." });
  }
});

// Single order: owner or admin.
router.get("/orders/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid order id." });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (user.role !== "admin" && order.userId !== req.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.json({ order });
  } catch {
    return res.status(500).json({ error: "Failed to load order." });
  }
});

// Simulated payment: owner (or admin) can mark a pending order as paid.
router.post("/orders/:id/pay", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid order id." });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (user.role !== "admin" && existing.userId !== req.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (existing.status !== "pending") {
      return res.status(400).json({ error: "Only pending orders can be paid." });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status: "paid" },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return res.json({ order });
  } catch {
    return res.status(500).json({ error: "Failed to process payment." });
  }
});

// Admin updates order status.
router.put(
  "/orders/:id/status",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = typeof req.body.status === "string" ? req.body.status.trim() : "";

      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: "Invalid order id." });
      }
      const allowed = ["pending", "paid", "shipped", "cancelled"];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
      }

      const order = await prisma.order.update({
        where: { id },
        data: { status },
        include: {
          items: { include: { product: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      return res.json({ order });
    } catch (err) {
      if (err.code === "P2025") {
        return res.status(404).json({ error: "Order not found." });
      }
      return res.status(500).json({ error: "Failed to update order status." });
    }
  }
);

module.exports = router;
