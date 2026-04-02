import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ThemeToggle } from "../App";

describe("ThemeToggle", () => {
  it("toggles theme and persists preference", async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const initialTheme = document.documentElement.getAttribute("data-theme");
    const button = screen.getByRole("button");
    await user.click(button);

    const nextTheme = initialTheme === "dark" ? "light" : "dark";
    expect(localStorage.getItem("theme")).toBe(nextTheme);
    expect(document.documentElement.getAttribute("data-theme")).toBe(nextTheme);
  });
});
