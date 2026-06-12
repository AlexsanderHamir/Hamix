import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders primary variant with accessible busy state when loading", () => {
    render(
      <Button loading variant="primary">
        Save changes
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Save changes" });
    expect(btn).toHaveClass("ui-btn--primary");
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).toBeDisabled();
  });

  it("renders secondary variant", () => {
    render(<Button variant="secondary">Cancel</Button>);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass(
      "ui-btn--secondary",
    );
  });
});
