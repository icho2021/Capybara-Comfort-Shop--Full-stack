const express = require("express");

const router = express.Router();

function pickRates(ratesObj, toList) {
  const pickedRates = {};
  if (typeof ratesObj !== "object" || ratesObj === null) return pickedRates;
  for (const code of toList) {
    if (typeof ratesObj[code] === "number") {
      pickedRates[code] = ratesObj[code];
    }
  }
  return pickedRates;
}

async function fetchOpenEr(from, toList) {
  const upstream = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`, {
    redirect: "follow",
  });
  if (!upstream.ok) return null;
  const data = await upstream.json();
  if (data.result !== "success" || typeof data.rates !== "object" || data.rates === null) {
    return null;
  }
  const rates = pickRates(data.rates, toList);
  if (Object.keys(rates).length === 0) return null;
  return {
    base: String(data.base_code || from),
    date: String(data.time_last_update_utc || ""),
    rates,
  };
}

// Fallback: Frankfurter (ECB) — works when the primary host is blocked or flaky.
async function fetchFrankfurter(from, toList) {
  const toParam = toList.join(",");
  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(toParam)}`;
  const upstream = await fetch(url, { redirect: "follow" });
  if (!upstream.ok) return null;
  const data = await upstream.json();
  if (typeof data.rates !== "object" || data.rates === null) return null;
  const rates = pickRates(data.rates, toList);
  if (Object.keys(rates).length === 0) return null;
  return {
    base: String(data.base || from),
    date: data.date ? String(data.date) : "",
    rates,
  };
}

// Read-only proxy to public FX endpoints (no API key). Tries ExchangeRate-API host first, then Frankfurter.
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
    let result = await fetchOpenEr(from, toList);
    if (!result) {
      result = await fetchFrankfurter(from, toList);
    }
    if (!result) {
      return res.status(502).json({ error: "Failed to fetch exchange rates from external API." });
    }
    return res.json({
      base: result.base,
      date: result.date,
      rates: result.rates,
    });
  } catch (err) {
    console.error("currency/external error:", err);
    try {
      const fallback = await fetchFrankfurter(from, toList);
      if (fallback) {
        return res.json({
          base: fallback.base,
          date: fallback.date,
          rates: fallback.rates,
        });
      }
    } catch (e2) {
      console.error("currency/external fallback error:", e2);
    }
    return res.status(502).json({ error: "Failed to fetch exchange rates from external API." });
  }
});

module.exports = router;
