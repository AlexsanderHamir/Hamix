import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectGoalCreateModal } from "./ProjectGoalCreateModal";

const baseProps = {
  onDismiss: vi.fn(),
  draftTitle: "",
  onDraftTitleChange: vi.fn(),
  draftDescription: "",
  onDraftDescriptionChange: vi.fn(),
  depsDraft: "",
  onDepsDraftChange: vi.fn(),
  criterionDrafts: [""] as string[],
  onCriterionDraftsChange: vi.fn(),
  createPending: false,
  createError: undefined as unknown,
  onCreate: vi.fn().mockResolvedValue(undefined),
};

describe("ProjectGoalCreateModal", () => {
  it("does not mount dialog markup when closed", () => {
    const { container } = render(<ProjectGoalCreateModal {...baseProps} open={false} />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("opens an accessible New goal dialog when open", () => {
    render(<ProjectGoalCreateModal {...baseProps} open />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "New goal" })).toBeInTheDocument();
  });
});
