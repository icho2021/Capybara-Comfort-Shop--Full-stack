const express = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { uploadImageToUploadsDir } = require("../lib/uploads");

const router = express.Router();

router.post("/upload/image", requireAuth, requireRole("admin"), (req, res) => {
  uploadImageToUploadsDir.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded." });
    }
    return res.status(201).json({
      imageUrl: `/api/uploads/${req.file.filename}`,
    });
  });
});

module.exports = router;
