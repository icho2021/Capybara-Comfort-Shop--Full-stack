import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProductsPage } from "../App";

describe("ProductsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders empty state when no products are returned", async () => {
    // Mock a successful API response with no items to validate empty-state UX.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, limit: 6, offset: 0 }),
    }));

    render(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no products match your filters/i)).toBeInTheDocument();
    });
  });
});
