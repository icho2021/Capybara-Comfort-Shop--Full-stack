const express = require("express");

const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

// Public reviews for a product.
router.get("/products/:productId/reviews", async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({ error: "Invalid product id." });
    }

    const reviews = await prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true } } },
    });

    return res.json({ reviews });
  } catch {
    return res.status(500).json({ error: "Failed to load reviews." });
  }
});

// Authenticated user creates or replaces review (one per user per product).
router.post("/products/:productId/reviews", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (user.role === "admin") {
      return res.status(403).json({ error: "Admin users cannot publish reviews." });
    }

    const productId = Number(req.params.productId);
    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === "string" ? req.body.comment.trim() : "";

    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({ error: "Invalid product id." });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "rating must be an integer 1-5." });
    }
    if (comment.length < 2) {
      return res.status(400).json({ error: "comment must be at least 2 characters." });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    const purchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId: req.userId,
          status: { in: ["paid", "shipped"] },
        },
      },
      select: { id: true },
    });
    if (!purchased) {
      return res.status(403).json({ error: "Only users who purchased this product can leave a review." });
    }

    const review = await prisma.review.upsert({
      where: {
        userId_productId: { userId: req.userId, productId },
      },
      create: {
        userId: req.userId,
        productId,
        rating,
        comment,
      },
      update: { rating, comment },
      include: { user: { select: { id: true, name: true } } },
    });

    return res.status(201).json({ review });
  } catch {
    return res.status(500).json({ error: "Failed to save review." });
  }
});

// Update own review (or admin).
router.put("/reviews/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === "string" ? req.body.comment.trim() : "";

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid review id." });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "rating must be an integer 1-5." });
    }
    if (comment.length < 2) {
      return res.status(400).json({ error: "comment must be at least 2 characters." });
    }

    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Review not found." });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user.role !== "admin" && existing.userId !== req.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const review = await prisma.review.update({
      where: { id },
      data: { rating, comment },
      include: { user: { select: { id: true, name: true } } },
    });

    return res.json({ review });
  } catch {
    return res.status(500).json({ error: "Failed to update review." });
  }
});

// Delete own review or any review (admin).
router.delete("/reviews/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid review id." });
    }

    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Review not found." });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user.role !== "admin" && existing.userId !== req.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.review.delete({ where: { id } });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to delete review." });
  }
});

module.exports = router;
