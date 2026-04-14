const express = require("express");

const { prisma } = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validateProductInput, validateProductUpdate } = require("../validators/productValidators");

const router = express.Router();

// Build Prisma where clause for public product listing (search + filters).
function buildProductWhere(query) {
  const search = typeof query.search === "string" ? query.search.trim() : "";
  const category = typeof query.category === "string" ? query.category.trim() : "";
  const minPrice = query.minPrice !== undefined ? Number(query.minPrice) : NaN;
  const maxPrice = query.maxPrice !== undefined ? Number(query.maxPrice) : NaN;

  const and = [{ isActive: true }];

  if (search) {
    and.push({
      OR: [
        { title: { contains: search } },
        { description: { contains: search } },
      ],
    });
  }

  if (category) {
    and.push({ category });
  }

  if (Number.isFinite(minPrice) && minPrice > 0) {
    and.push({ price: { gte: minPrice } });
  }

  if (Number.isFinite(maxPrice) && maxPrice > 0) {
    and.push({ price: { lte: maxPrice } });
  }

  return { AND: and };
}

// Public product listing with pagination, optional search and category/price filters.
router.get("/products", async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit);
    const offsetRaw = Number(req.query.offset);
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? limitRaw : 10;
    const offset = Number.isInteger(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

    const where = buildProductWhere(req.query);

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ]);

    return res.json({ items, total, limit, offset });
  } catch {
    return res.status(500).json({ error: "Failed to fetch products." });
  }
});

// Public single product by id.
router.get("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid product id." });
    }

    const product = await prisma.product.findFirst({
      where: { id, isActive: true },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    return res.json({ product });
  } catch {
    return res.status(500).json({ error: "Failed to fetch product." });
  }
});

// Admin creates a product.
router.post(
  "/products",
  requireAuth,
  requireRole("admin"),
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

// Admin updates a product.
router.put(
  "/products/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: "Invalid product id." });
      }

      const errors = validateProductUpdate(req.body);
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({ error: "Validation failed", fields: errors });
      }

      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: "Product not found." });
      }

      const data = {};
      if (req.body.title !== undefined) data.title = req.body.title.trim();
      if (req.body.description !== undefined) {
        data.description =
          typeof req.body.description === "string" ? req.body.description.trim() : null;
      }
      if (req.body.category !== undefined) data.category = req.body.category.trim();
      if (req.body.imageUrl !== undefined) {
        data.imageUrl =
          typeof req.body.imageUrl === "string" && req.body.imageUrl.trim() !== ""
            ? req.body.imageUrl.trim()
            : null;
      }
      if (req.body.price !== undefined) data.price = Number(req.body.price);
      if (req.body.stock !== undefined) data.stock = Number(req.body.stock);
      if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive);

      const product = await prisma.product.update({
        where: { id },
        data,
      });

      return res.json({ product });
    } catch {
      return res.status(500).json({ error: "Failed to update product." });
    }
  }
);

// Admin soft-deletes a product (sets isActive false).
router.delete(
  "/products/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: "Invalid product id." });
      }

      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: "Product not found." });
      }

      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: "Failed to delete product." });
    }
  }
);

module.exports = router;
