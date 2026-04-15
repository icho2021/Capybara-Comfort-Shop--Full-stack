const express = require("express");

const { prisma } = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { uploadImageToUploadsDir } = require("../lib/uploads");

const router = express.Router();

const BACKGROUND_KEY = "storefront.backgroundUrl";
const POPULAR_PRODUCT_IDS_KEY = "storefront.popularProductIds";
const MAX_POPULAR_ITEMS = 12;

function parsePopularIds(raw) {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  } catch {
    return [];
  }
}

// Public: home page "popular" products (admin-curated order).
router.get("/settings/popular-products", async (_req, res) => {
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key: POPULAR_PRODUCT_IDS_KEY } });
    const ids = parsePopularIds(setting?.value);
    if (ids.length === 0) {
      return res.json({ productIds: [], products: [] });
    }
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
    });
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const orderedProducts = ids.map((id) => byId[id]).filter(Boolean);
    return res.json({
      productIds: orderedProducts.map((p) => p.id),
      products: orderedProducts,
    });
  } catch {
    return res.status(500).json({ error: "Failed to load popular products." });
  }
});

// Admin: set which active products appear on the home page (order preserved).
router.put("/settings/popular-products", requireAuth, requireRole("admin"), async (req, res) => {
  const raw = req.body?.productIds;
  if (!Array.isArray(raw)) {
    return res.status(400).json({ error: "productIds must be an array of product ids." });
  }
  const ids = [...new Set(raw.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (ids.length > MAX_POPULAR_ITEMS) {
    return res.status(400).json({ error: `At most ${MAX_POPULAR_ITEMS} products can be featured.` });
  }
  if (ids.length === 0) {
    try {
      await prisma.appSetting.delete({ where: { key: POPULAR_PRODUCT_IDS_KEY } }).catch(() => null);
      return res.json({ productIds: [], products: [] });
    } catch {
      return res.status(500).json({ error: "Failed to save popular products." });
    }
  }
  try {
    const found = await prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true },
    });
    const foundSet = new Set(found.map((p) => p.id));
    for (const id of ids) {
      if (!foundSet.has(id)) {
        return res.status(400).json({ error: `Invalid or inactive product id: ${id}.` });
      }
    }
    const orderedFull = await prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
    });
    const byId = Object.fromEntries(orderedFull.map((p) => [p.id, p]));
    const orderedProducts = ids.map((id) => byId[id]).filter(Boolean);
    await prisma.appSetting.upsert({
      where: { key: POPULAR_PRODUCT_IDS_KEY },
      create: { key: POPULAR_PRODUCT_IDS_KEY, value: JSON.stringify(ids) },
      update: { value: JSON.stringify(ids) },
    });
    return res.json({
      productIds: orderedProducts.map((p) => p.id),
      products: orderedProducts,
    });
  } catch (err) {
    console.error("popular-products PUT:", err);
    return res.status(500).json({ error: "Failed to save popular products." });
  }
});

// Public: read current configured background image URL (or null).
router.get("/settings/background", async (_req, res) => {
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key: BACKGROUND_KEY } });
    return res.json({ backgroundUrl: setting?.value || null });
  } catch {
    return res.status(500).json({ error: "Failed to load background setting." });
  }
});

// Admin: upload and set a new background image.
router.post("/settings/background", requireAuth, requireRole("admin"), (req, res) => {
  uploadImageToUploadsDir.single("image")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded." });
    }

    try {
      const url = `/api/uploads/${req.file.filename}`;
      await prisma.appSetting.upsert({
        where: { key: BACKGROUND_KEY },
        create: { key: BACKGROUND_KEY, value: url },
        update: { value: url },
      });
      return res.status(201).json({ backgroundUrl: url });
    } catch {
      return res.status(500).json({ error: "Failed to save background setting." });
    }
  });
});

// Admin: reset to default (removes custom background URL).
router.delete("/settings/background", requireAuth, requireRole("admin"), async (_req, res) => {
  try {
    await prisma.appSetting.delete({ where: { key: BACKGROUND_KEY } }).catch(() => null);
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to reset background setting." });
  }
});

module.exports = router;

