import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReferenceExchangePanel } from "../components/ReferenceExchangePanel";

describe("ReferenceExchangePanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches external exchange rates when the user clicks the button", async () => {
    const user = userEvent.setup();
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
    await user.click(screen.getByRole("button", { name: /fetch rates/i }));

    await waitFor(() => {
      expect(screen.getByText(/1 ≈ 0\.9200/i)).toBeInTheDocument();
      expect(screen.getAllByText(/EUR/i).length).toBeGreaterThan(0);
    });
  });
});
