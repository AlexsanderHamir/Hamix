import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, afterEach } from "vitest";
import { ROUTER_FUTURE_FLAGS } from "@/lib/routerFutureFlags";
import { ModalStackProvider } from "@/shared/ModalStackContext";
import { requestUrl } from "@/test/requestUrl";
import { respondGlobalGitApi } from "@/test/handlers/gitGlobal";
import { RepositoriesListPage } from "./RepositoriesListPage";
import { RegisterRepositoryModal } from "./modals/RegisterRepositoryModal";

const repoId = "00000000-0000-4000-8000-000000000010";
const repoId2 = "00000000-0000-4000-8000-000000000011";
const wtB = "00000000-0000-4000-8000-000000000030";
const branchId = "00000000-0000-4000-8000-000000000040";

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

function renderListPage(initialEntries: string[] = ["/worktrees"]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter future={ROUTER_FUTURE_FLAGS} initialEntries={initialEntries}>
        <ModalStackProvider>
          <Routes>
            <Route path="/worktrees" element={<RepositoriesListPage />} />
            <Route path="/worktrees/:repositoryId" element={<div>Detail</div>} />
          </Routes>
        </ModalStackProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("RepositoriesListPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows repository setup copy when no repositories are registered", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.endsWith("/git/repositories")) {
        return jsonResponse({ repositories: [] });
      }
      const res = respondGlobalGitApi(url, "GET");
      if (res) return res;
      return jsonResponse({ error: "not found" }, { status: 404 });
    });

    renderListPage();
    expect(await screen.findByRole("heading", { name: /^repositories$/i })).toBeInTheDocument();
    expect(
      await screen.findByText(/register a repository to get started/i),
    ).toBeInTheDocument();
    const registerButtons = screen.getAllByRole("button", { name: /Register repository/i });
    expect(registerButtons).toHaveLength(1);
    await userEvent.click(registerButtons[0]!);
    expect(
      await screen.findByRole("button", { name: /Choose folder/i }),
    ).toBeInTheDocument();
  });

  it("shows only an error callout when repository fetch fails with Not Found", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.endsWith("/git/repositories")) {
        return jsonResponse({ error: "Not Found" }, { status: 404 });
      }
      return jsonResponse({ error: "not found" }, { status: 404 });
    });

    renderListPage();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not load repositories/i);
    expect(alert).toHaveTextContent(/git API may be unavailable/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText(/register a repository to get started/i)).not.toBeInTheDocument();
  });

  it("opens register modal from ?register=1 and strips the query param", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.endsWith("/git/repositories")) {
        return jsonResponse({ repositories: [] });
      }
      return jsonResponse({ error: "not found" }, { status: 404 });
    });

    renderListPage(["/worktrees?register=1"]);
    expect(
      await screen.findByRole("button", { name: /Choose folder/i }),
    ).toBeInTheDocument();
  });

  it("renders register repository modal when open", () => {
    render(
      <ModalStackProvider>
        <RegisterRepositoryModal
          open
          pending={false}
          error={null}
          onClose={() => {}}
          onSubmit={() => {}}
        />
      </ModalStackProvider>,
    );
    expect(screen.getByRole("button", { name: /Choose folder/i })).toBeInTheDocument();
  });

  it("lists one repository without nested worktree rows", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.endsWith("/git/repositories")) {
        return jsonResponse({
          repositories: [
            {
              id: repoId,
              path: "/repo/main",
              git_common_dir: "",
              host_path: "",
              default_branch: "main",
              created_at: "2026-06-22T12:00:00Z",
              updated_at: "2026-06-22T12:00:00Z",
            },
          ],
        });
      }
      if (url.includes(`/git/repositories/${repoId}/worktrees`)) {
        return jsonResponse({
          worktrees: [
            {
              id: "00000000-0000-4000-8000-000000000020",
              repository_id: repoId,
              path: "/repo/main",
              name: "main",
              is_main: true,
              branch_id: branchId,
              created_at: "2026-06-22T12:00:00Z",
            },
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
      if (url.includes(`/git/repositories/${repoId}/branches`)) {
        return jsonResponse({
          branches: [
            {
              id: branchId,
              repository_id: repoId,
              name: "main",
              head_sha: "abc123",
              created_at: "2026-06-22T12:00:00Z",
            },
          ],
        });
      }
      return jsonResponse({ error: "not found" }, { status: 404 });
    });

    renderListPage();
    expect(
      await screen.findByRole("heading", { level: 2, name: /^repositories$/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("main", { selector: ".draft-row__name" })).toBeInTheDocument();
    expect(await screen.findByRole("gridcell", { name: /1 worktree/i })).toHaveTextContent("1");
    expect(screen.queryByText("feature", { selector: ".worktree-row__label" })).not.toBeInTheDocument();
  });

  it("navigates to repository detail when a row is clicked", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.endsWith("/git/repositories")) {
        return jsonResponse({
          repositories: [
            {
              id: repoId,
              path: "/repo/main",
              git_common_dir: "",
              host_path: "",
              default_branch: "main",
              created_at: "2026-06-22T12:00:00Z",
              updated_at: "2026-06-22T12:00:00Z",
            },
          ],
        });
      }
      if (url.includes(`/git/repositories/${repoId}/worktrees`)) {
        return jsonResponse({ worktrees: [] });
      }
      return jsonResponse({ error: "not found" }, { status: 404 });
    });

    renderListPage();
    const row = await screen.findByRole("row", { name: /main, 0 worktrees/i });
    await userEvent.click(row);
    expect(await screen.findByText("Detail")).toBeInTheDocument();
  });

  it("filters repositories with the search field", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.endsWith("/git/repositories")) {
        return jsonResponse({
          repositories: [
            {
              id: repoId,
              path: "/repo/hamix",
              git_common_dir: "",
              host_path: "C:/Users/dev/Documents/hamix",
              default_branch: "main",
              created_at: "2026-06-22T12:00:00Z",
              updated_at: "2026-06-22T12:00:00Z",
            },
            {
              id: repoId2,
              path: "/repo/other",
              git_common_dir: "",
              host_path: "C:/Users/dev/Documents/other",
              default_branch: "main",
              created_at: "2026-06-22T12:00:00Z",
              updated_at: "2026-06-22T12:00:00Z",
            },
          ],
        });
      }
      if (url.includes("/git/repositories/") && url.includes("/worktrees")) {
        return jsonResponse({ worktrees: [] });
      }
      return jsonResponse({ error: "not found" }, { status: 404 });
    });

    renderListPage();
    const search = await screen.findByRole("searchbox", { name: /search repositories/i });
    expect(await screen.findByText("hamix", { selector: ".draft-row__name" })).toBeInTheDocument();
    expect(screen.getByText("other", { selector: ".draft-row__name" })).toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, "hamix");
    await waitFor(() => {
      expect(screen.queryByText("other", { selector: ".draft-row__name" })).not.toBeInTheDocument();
    });
    expect(screen.getByText("hamix", { selector: ".draft-row__name" })).toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, "nomatch");
    await waitFor(() => {
      expect(screen.queryByText("hamix", { selector: ".draft-row__name" })).not.toBeInTheDocument();
    });
    expect(await screen.findByText(/no matching repositories/i)).toBeInTheDocument();
  });
});
