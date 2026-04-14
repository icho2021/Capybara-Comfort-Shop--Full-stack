const express = require("express");

const router = express.Router();

// Read-only proxy to ExchangeRate-API free endpoint (no API key). Fits storefront reference-price demos.
router.get("/currency/external", async (req, res) => {
  const from = String(req.query.from || "USD")
    .trim()
    .toUpperCase()
    .slice(0, 3);
  const toParam = String(req.query.to || "EUR,GBP,JPY")
    .trim()
    .replace(/\s+/g, "");

  if (!/^[A-Z]{3}$/.test(from)) {
    return res.status(400).json({ error: "from must be a 3-letter currency code (e.g. USD)." });
  }

  const toList = toParam
    .split(",")
    .map((c) => c.toUpperCase().slice(0, 3))
    .filter((c) => /^[A-Z]{3}$/.test(c));

  if (toList.length === 0 || toList.length > 8) {
    return res.status(400).json({ error: "to must be 1–8 comma-separated currency codes (e.g. EUR,GBP)." });
  }

  try {
    const upstream = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`);
    if (!upstream.ok) {
      return res.status(502).json({ error: "External currency service returned an error." });
    }
    const data = await upstream.json();
    if (data.result !== "success" || typeof data.rates !== "object" || data.rates === null) {
      return res.status(502).json({ error: "External currency service returned invalid data." });
    }
    const pickedRates = {};
    for (const code of toList) {
      if (typeof data.rates[code] === "number") {
        pickedRates[code] = data.rates[code];
      }
    }
    return res.json({
      base: String(data.base_code || from),
      date: String(data.time_last_update_utc || ""),
      rates: pickedRates,
    });
  } catch (err) {
    console.error("currency/external error:", err);
    return res.status(502).json({ error: "Failed to fetch exchange rates from external API." });
  }
});

module.exports = router;
