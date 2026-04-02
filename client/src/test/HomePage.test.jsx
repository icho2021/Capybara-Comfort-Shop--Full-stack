import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { HomePage } from "../App";

describe("HomePage", () => {
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
