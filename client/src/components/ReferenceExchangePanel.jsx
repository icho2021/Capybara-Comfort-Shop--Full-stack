import { useEffect, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/+$/, "");

const COMMON_BASE = ["USD", "EUR", "GBP", "JPY", "CNY"];
const CURRENCY_FLAG = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  CNY: "🇨🇳",
  CAD: "🇨🇦",
  AUD: "🇦🇺",
  KRW: "🇰🇷",
  CHF: "🇨🇭",
  INR: "🇮🇳",
};

function flagForCurrency(code) {
  return CURRENCY_FLAG[code] || "🏳️";
}

function normalizeTargets(input) {
  return input
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z]{3}$/.test(s))
    .slice(0, 8);
}

async function fetchRatesFromFrankfurter(from, toRaw) {
  const targets = normalizeTargets(toRaw);
  if (!/^[A-Z]{3}$/.test(from) || targets.length === 0) return null;
  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(targets.join(","))}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  if (!data?.rates || typeof data.rates !== "object") return null;
  return {
    base: String(data.base || from),
    date: String(data.date || ""),
    rates: data.rates,
  };
}

// External API demo: ECB reference FX via Frankfurter (read-only, no API key). Useful for cross-border price hints.
export function ReferenceExchangePanel() {
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR,GBP,JPY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(undefined);

  async function loadRates() {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to: to.replace(/\s+/g, "") });
      const response = await fetch(`${API_BASE}/currency/external?${params.toString()}`, {
        credentials: "omit",
      });
      const raw = await response.text();
      let data;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        setError(
          `Unexpected response (${response.status}). If the URL opened was not JSON, check VITE_API_BASE and redeploy.`
        );
        return;
      }
      if (!response.ok) {
        const direct = await fetchRatesFromFrankfurter(from, to.replace(/\s+/g, ""));
        if (direct) {
          setPayload(direct);
          setError("");
          return;
        }
        setError(data.error || "Could not load exchange rates.");
        return;
      }
      setPayload(data);
    } catch (err) {
      const direct = await fetchRatesFromFrankfurter(from, to.replace(/\s+/g, ""));
      if (direct) {
        setPayload(direct);
        setError("");
      } else {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(`Network error: ${msg}. Try again.`);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries = payload?.rates ? Object.entries(payload.rates) : [];

  return (
    <div className="reference-exchange-panel" style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
      <h3>Reference exchange rates (external API)</h3>
      <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
        Compare a base currency to one or more targets using a public exchange-rate API. Store prices stay in USD; this is read-only context for shoppers abroad.
      </p>
      <div className="form" style={{ flexDirection: "row", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
        <label style={{ flex: "1 1 140px" }}>
          Base
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            {COMMON_BASE.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: "2 1 200px" }}>
          Target currencies (comma-separated)
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="EUR,GBP,JPY" />
        </label>
        <button className="btn" type="button" onClick={loadRates} disabled={loading}>
          {loading ? "Loading…" : "Fetch rates"}
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}{" "}
          <button className="btn link" type="button" onClick={loadRates}>
            Retry
          </button>
        </p>
      )}
      {!loading && !error && payload === undefined && (
        <p style={{ color: "var(--text-secondary)" }}>No rates loaded yet. Click &quot;Fetch rates&quot;.</p>
      )}
      {payload && entries.length === 0 && <p style={{ color: "var(--text-secondary)" }}>No rates returned.</p>}
      {entries.length > 0 && (
        <div style={{ marginTop: "12px" }}>
          <p style={{ margin: "0 0 8px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Date: {payload.date} · Base: {payload.base}
          </p>
          <ul className="exchange-rate-list">
            {entries.map(([code, rate]) => (
              <li key={code} className="exchange-rate-item">
                <span className="fx-pill">
                  {flagForCurrency(payload.base)} {payload.base}
                </span>
                <span className="fx-value">1 ≈ {Number(rate).toFixed(4)}</span>
                <span className="fx-pill">
                  {flagForCurrency(code)} {code}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
