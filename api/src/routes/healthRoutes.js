const express = require("express");

const router = express.Router();

// Health-check endpoint used to verify API availability.
router.get("/ping", (_req, res) => {
  res.json({ ok: true, message: "pong" });
});

module.exports = router;
