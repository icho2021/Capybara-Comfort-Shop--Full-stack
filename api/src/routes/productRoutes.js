const express = require("express");

const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middlewares/auth");
const { validateProductInput } = require("../validators/productValidators");

const router = express.Router();

// Public product listing endpoint with basic limit/offset pagination support.
router.get("/products", async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit);
    const offsetRaw = Number(req.query.offset);
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? limitRaw : 10;
    const offset = Number.isInteger(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.product.count({ where: { isActive: true } }),
    ]);

    return res.json({ items, total, limit, offset });
  } catch {
    return res.status(500).json({ error: "Failed to fetch products." });
  }
});

// Protected product creation endpoint (authenticated users).
router.post(
  "/products",
  requireAuth,
  async (req, res) => {
    try {
      const errors = validateProductInput(req.body);
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({ error: "Validation failed", fields: errors });
      }

      const product = await prisma.product.create({
        data: {
          title: req.body.title.trim(),
          description:
            typeof req.body.description === "string"
              ? req.body.description.trim()
              : null,
          category: req.body.category.trim(),
          imageUrl:
            typeof req.body.imageUrl === "string" &&
            req.body.imageUrl.trim() !== ""
              ? req.body.imageUrl.trim()
              : null,
          price: Number(req.body.price),
          stock: Number(req.body.stock),
          isActive: true,
        },
      });
      return res.status(201).json({ product });
    } catch {
      return res.status(500).json({ error: "Failed to create product." });
    }
  }
);

module.exports = router;
