import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Automation } from "@/types";
import { ModalStackProvider } from "@/shared/ModalStackContext";
import { AutomationPicker } from "./AutomationPicker";
import { automationQueryKeys } from "./queryKeys";

const automations: Automation[] = [
  {
    id: "auto-1",
    title: "Run tests",
    description: "Execute tests before finishing.",
    created_at: "2026-06-15T00:00:00Z",
    updated_at: "2026-06-15T00:00:00Z",
  },
  {
    id: "auto-2",
    title: "Avoid docs",
    description: "Do not edit markdown docs.",
    created_at: "2026-06-15T00:00:00Z",
    updated_at: "2026-06-15T00:00:00Z",
  },
];

function renderPicker(selections: { automation_id: string; state: "yes" | "no" }[] = []) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  queryClient.setQueryData(automationQueryKeys.list(false, 200), {
    automations,
    limit: 200,
  });
  const onChange = vi.fn();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ModalStackProvider>{children}</ModalStackProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  render(
    <AutomationPicker selections={selections} onChange={onChange} />,
    { wrapper: Wrapper },
  );

  return { onChange };
}

describe("AutomationPicker", () => {
  it("opens browse modal and sets Yes on a behavior", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker();

    await user.click(screen.getByRole("button", { name: /browse automations/i }));
    const dialog = screen.getByRole("dialog", { name: /choose agent behaviors/i });

    const row = within(dialog).getByText("Run tests").closest("li");
    expect(row).toBeTruthy();
    await user.click(within(row!).getByRole("button", { name: "Yes" }));

    expect(onChange).toHaveBeenCalledWith([
      { automation_id: "auto-1", state: "yes" },
    ]);
  });

  it("removes a selection when Omit is chosen", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker([
      { automation_id: "auto-1", state: "yes" },
    ]);

    await user.click(screen.getByRole("button", { name: /browse automations/i }));
    const dialog = screen.getByRole("dialog", { name: /choose agent behaviors/i });
    const row = within(dialog).getByText("Run tests").closest("li");
    await user.click(within(row!).getByRole("button", { name: "Omit" }));

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
