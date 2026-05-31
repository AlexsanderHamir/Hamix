import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ROUTER_FUTURE_FLAGS } from "@/lib/routerFutureFlags";
import { TaskModelConfigModal } from "./TaskModelConfigModal";

function renderModal(overrides: Partial<Parameters<typeof TaskModelConfigModal>[0]> = {}) {
  const props = {
    taskTitle: "Refactor cache",
    saving: false,
    onChangeModel: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  return {
    props,
    ...render(
      <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
        <TaskModelConfigModal {...props} />
      </MemoryRouter>,
    ),
  };
}

describe("TaskModelConfigModal", () => {
  it("renders the global vs per-task split with the task title", () => {
    renderModal();

    expect(
      screen.getByRole("heading", { name: /model configuration/i, level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/global model/i)).toBeInTheDocument();
    expect(screen.getByText(/per-task model/i)).toBeInTheDocument();
    expect(screen.getByText(/refactor cache/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /open settings/i }),
    ).toHaveAttribute("href", "/settings#cursor-agent");
  });

  it("closes and forwards Change model to the parent", async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    await user.click(screen.getByRole("button", { name: /change model/i }));

    expect(props.onClose).toHaveBeenCalledOnce();
    expect(props.onChangeModel).toHaveBeenCalledOnce();
  });

  it("Close button dismisses without calling onChangeModel", async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    await user.click(screen.getByRole("button", { name: /^close$/i }));

    expect(props.onClose).toHaveBeenCalledOnce();
    expect(props.onChangeModel).not.toHaveBeenCalled();
  });

  it("disables the Change model CTA while saving", () => {
    renderModal({ saving: true });
    expect(screen.getByRole("button", { name: /change model/i })).toBeDisabled();
  });
});
