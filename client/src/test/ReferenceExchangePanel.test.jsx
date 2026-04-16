import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReferenceExchangePanel } from "../components/ReferenceExchangePanel";

describe("ReferenceExchangePanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("auto-loads external exchange rates on mount", async () => {
    const body = JSON.stringify({
      base: "USD",
      date: "2026-04-14",
      rates: { EUR: 0.92, GBP: 0.79 },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => body,
      })
    );

    render(<ReferenceExchangePanel />);

    await waitFor(() => {
      expect(screen.getByText(/1 ≈ 0\.9200/i)).toBeInTheDocument();
      expect(screen.getAllByText(/EUR/i).length).toBeGreaterThan(0);
    });
  });
});
