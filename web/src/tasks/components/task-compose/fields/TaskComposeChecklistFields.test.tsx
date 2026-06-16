import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskComposeChecklistFields } from "./TaskComposeChecklistFields";

describe("TaskComposeChecklistFields", () => {
  it("shows verify command badge below criterion text in the meta row", () => {
    render(
      <TaskComposeChecklistFields
        checklistHeadingId="checklist-heading"
        checklistItems={[
          {
            text: "The full test suite still passes.",
            verify_commands: [{ command: "go test ./...", expected_outcome: "pass" }],
          },
        ]}
        disabled={false}
        onOpenNewCriterion={vi.fn()}
        onOpenEditCriterion={vi.fn()}
        onRemoveRow={vi.fn()}
      />,
    );

    expect(screen.getByText("The full test suite still passes.")).toBeInTheDocument();
    expect(screen.getByLabelText(/1 automated verify command/i)).toHaveTextContent(
      "1 command",
    );
  });
});
