import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AutomationsPage } from "./AutomationsPage";
import { automationQueryKeys } from "./queryKeys";

vi.mock("@/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api")>();
  return {
    ...actual,
    listAutomations: vi.fn(),
    createAutomation: vi.fn(),
    patchAutomation: vi.fn(),
    deleteAutomation: vi.fn(),
  };
});

import { listAutomations } from "@/api";

const mockedList = vi.mocked(listAutomations);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  mockedList.mockResolvedValue({ automations: [], limit: 200 });
  queryClient.setQueryData(automationQueryKeys.list(false, 200), {
    automations: [],
    limit: 200,
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  render(<AutomationsPage />, { wrapper: Wrapper });
}

describe("AutomationsPage", () => {
  it("renders the library heading and empty state", async () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Automations" })).toBeInTheDocument();
    expect(screen.getByText(/no automations yet/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /new automation/i }),
    ).toBeInTheDocument();
  });
});
