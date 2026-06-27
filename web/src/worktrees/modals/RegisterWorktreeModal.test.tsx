import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RegisterWorktreeModal } from "./RegisterWorktreeModal";

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

describe("RegisterWorktreeModal", () => {
  it("prompts to reconcile when live worktree inventory cannot load", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/worktrees/live")) {
        return jsonResponse({ error: "open repository: path missing" }, { status: 500 });
      }
      if (url.includes("/branches")) {
        return jsonResponse({ branches: [] });
      }
      return new Response("not found", { status: 404 });
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={client}>
        <RegisterWorktreeModal
          open
          pending={false}
          error={null}
          repositoryId="00000000-0000-4000-8000-000000000010"
          storedPath="/stale/old-checkout"
          onReconcile={vi.fn()}
          onClose={() => {}}
          onSubmit={() => {}}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("button", { name: /Reconcile repository/i })).toBeInTheDocument();
    expect(
      screen.getByText(/registered checkout path isn't available on disk/i),
    ).toBeInTheDocument();

    fetchMock.mockRestore();
  });
});
