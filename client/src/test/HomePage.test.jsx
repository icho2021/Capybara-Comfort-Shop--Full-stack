import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HomePage } from "../App";

describe("HomePage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url) => {
        if (String(url).includes("popular-products")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ productIds: [], products: [] }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ items: [], total: 0 }),
        });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the public welcome content", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /welcome/i })).toBeInTheDocument();
    expect(
      screen.getByText(/capybara comfort shop is a cozy mini e-commerce website/i)
    ).toBeInTheDocument();
  });
});
