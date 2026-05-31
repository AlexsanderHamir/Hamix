import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TaskDetailAttentionBar } from "./TaskDetailAttentionBar";

describe("TaskDetailAttentionBar", () => {
  it("shows attention copy when attention.show is true", () => {
    render(
      <TaskDetailAttentionBar
        attention={{
          show: true,
          headline: "Blocked",
          body: "The agent is blocked.",
        }}
        saving={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.getByText("The agent is blocked.")).toBeInTheDocument();
  });

  it("shows informational ok state when attention.show is false", () => {
    render(
      <TaskDetailAttentionBar
        attention={{ show: false, headline: "", body: "" }}
        saving={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/no agent is waiting on you for this task right now/i),
    ).toBeInTheDocument();
  });

  it("invokes edit and delete handlers", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <TaskDetailAttentionBar
        attention={{ show: false, headline: "", body: "" }}
        saving={false}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole("button", { name: /edit task/i }));
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("disables action buttons while saving", () => {
    render(
      <TaskDetailAttentionBar
        attention={{ show: false, headline: "", body: "" }}
        saving
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /edit task/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeDisabled();
  });

  it("renders Run again when onRequeue is provided", async () => {
    const user = userEvent.setup();
    const onRequeue = vi.fn();
    render(
      <TaskDetailAttentionBar
        attention={{ show: false, headline: "", body: "" }}
        saving={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRequeue={onRequeue}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^run again$/i }));
    expect(onRequeue).toHaveBeenCalledOnce();
  });

  // Pin the consolidation: the model-configuration CTA replaces the inline
  // "Model configuration" panel that used to render below the action row,
  // and only shows up when showModelConfig is set (today: failed runs).
  it("renders Model configuration only when showModelConfig is true", async () => {
    const user = userEvent.setup();
    const onConfigureModel = vi.fn();

    const { rerender } = render(
      <TaskDetailAttentionBar
        attention={{ show: false, headline: "", body: "" }}
        saving={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onConfigureModel={onConfigureModel}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /model configuration/i }),
    ).not.toBeInTheDocument();

    rerender(
      <TaskDetailAttentionBar
        attention={{ show: false, headline: "", body: "" }}
        saving={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onConfigureModel={onConfigureModel}
        showModelConfig
      />,
    );

    const button = screen.getByRole("button", {
      name: /model configuration/i,
    });
    await user.click(button);
    expect(onConfigureModel).toHaveBeenCalledOnce();
  });

  it("no longer renders the legacy inline model-config panel", () => {
    render(
      <TaskDetailAttentionBar
        attention={{ show: false, headline: "", body: "" }}
        saving={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onConfigureModel={vi.fn()}
        showModelConfig
      />,
    );

    expect(
      screen.queryByRole("heading", { name: /model configuration/i, level: 3 }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/global model/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/per-task model/i)).not.toBeInTheDocument();
  });
});
