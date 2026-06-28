import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, afterEach } from "vitest";
import { ROUTER_FUTURE_FLAGS } from "@/lib/routerFutureFlags";
import { ModalStackProvider } from "@/shared/ModalStackContext";
import { requestUrl } from "@/test/requestUrl";
import { RepositoryWorktreesPage } from "./RepositoryWorktreesPage";

const repoId = "00000000-0000-4000-8000-000000000010";
const wtB = "00000000-0000-4000-8000-000000000030";
const branchId = "00000000-0000-4000-8000-000000000040";

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

function renderDetailPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        future={ROUTER_FUTURE_FLAGS}
        initialEntries={[`/worktrees/${repoId}`]}
      >
        <ModalStackProvider>
          <Routes>
            <Route path="/worktrees/:repositoryId" element={<RepositoryWorktreesPage />} />
          </Routes>
        </ModalStackProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockRepositoryDetailFetch() {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    const method = init?.method ?? "GET";
    if (method === "GET" && url.endsWith(`/git/repositories/${repoId}`)) {
      return jsonResponse({
        id: repoId,
        path: "/repo/main",
        git_common_dir: "",
        host_path: "",
        default_branch: "main",
        created_at: "2026-06-22T12:00:00Z",
        updated_at: "2026-06-22T12:00:00Z",
      });
    }
    if (method === "GET" && url.includes(`/git/repositories/${repoId}/worktrees`)) {
      return jsonResponse({
        worktrees: [
          {
            id: wtB,
            repository_id: repoId,
            path: "/repo/feature",
            name: "feature",
            is_main: false,
            branch_id: branchId,
            created_at: "2026-06-22T12:00:00Z",
          },
        ],
      });
    }
    if (method === "GET" && url.includes(`/git/repositories/${repoId}/branches`)) {
      return jsonResponse({
        branches: [
          {
            id: branchId,
            repository_id: repoId,
            name: "feature",
            head_sha: "abc123",
            created_at: "2026-06-22T12:00:00Z",
          },
        ],
      });
    }
    if (method === "DELETE") {
      return jsonResponse(
        { error: "task still running", code: "has_running_task" },
        { status: 409 },
      );
    }
    return jsonResponse({ error: "not found" }, { status: 404 });
  });
}

describe("RepositoryWorktreesPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders repository title and worktree rows", async () => {
    mockRepositoryDetailFetch();
    renderDetailPage();
    expect(await screen.findByRole("heading", { level: 1, name: "main" })).toBeInTheDocument();
    expect(await screen.findByText("feature", { selector: ".worktree-row__label" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /all repositories/i })).toBeInTheDocument();
  });

  it("maps unregister 409 has_running_task to dialog copy", async () => {
    mockRepositoryDetailFetch();
    renderDetailPage();
    await screen.findByText("feature", { selector: ".worktree-row__label" });
    await userEvent.click(
      screen.getByRole("button", { name: /Worktree actions for feature/i }),
    );
    await userEvent.click(screen.getByRole("menuitem", { name: /Unregister worktree/i }));
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /^Unregister$/i }));
    await waitFor(() => {
      expect(within(dialog).getByText(/task still running/i)).toBeInTheDocument();
    });
    expect(within(dialog).getByRole("button", { name: /^Unregister$/i })).toBeDisabled();
  });
});
