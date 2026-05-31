import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ROUTER_FUTURE_FLAGS } from "@/lib/routerFutureFlags";
import { requestUrl } from "@/test/requestUrl";
import { DEFAULT_PROJECT_ID, type Project } from "@/types";
import { ProjectListPage } from "./ProjectListPage";
import { projectQueryKeys } from "./queryKeys";

type FetchInput = RequestInfo | URL;

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

function project(index: number, overrides: Partial<Project> = {}): Project {
  return {
    id: `project-${index}`,
    name: `Project ${index}`,
    description: `Context space ${index}`,
    status: "active",
    context_summary: "",
    created_at: "2026-04-27T00:00:00Z",
    updated_at: "2026-04-27T00:00:00Z",
    ...overrides,
  };
}

function renderPage(projects: Project[]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  queryClient.setQueryData(projectQueryKeys.list(true, 50), {
    projects,
    limit: 50,
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
        <ProjectListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProjectListPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a dense library for larger project collections", async () => {
    const projects = Array.from({ length: 10 }, (_, index) =>
      project(index + 1, index > 7 ? { status: "archived" } : {}),
    );

    renderPage(projects);

    const summary = screen.getByLabelText("Project summary");
    expect(within(summary).getByText("10")).toBeInTheDocument();
    expect(within(summary).getByText("8")).toBeInTheDocument();
    expect(within(summary).getByText("2")).toBeInTheDocument();

    const library = await screen.findByLabelText("Projects");
    expect(within(library).getAllByRole("link")).toHaveLength(10);
    expect(
      within(library).queryAllByRole("button", { name: /^Delete project / }),
    ).toHaveLength(0);
    expect(
      within(library).getByRole("link", { name: /^Open project Project 10$/ }),
    ).toHaveAttribute("href", "/projects/project-10");
  });

  it("does not surface row delete controls on the list", () => {
    const projects: Project[] = [
      project(0, { id: DEFAULT_PROJECT_ID, name: "Default project" }),
      project(1, { id: "custom-a", name: "Alpha" }),
      project(2, { id: "custom-b", name: "Beta" }),
    ];
    renderPage(projects);
    const library = screen.getByLabelText("Projects");
    expect(
      within(library).queryAllByRole("button", { name: /^Delete project / }),
    ).toHaveLength(0);
  });

  it("creates a project with name and description via the dialog", async () => {
    const created = {
      id: "new-1",
      name: "Payments",
      description: "Card flow",
      status: "active",
      context_summary: "",
      created_at: "2026-05-31T00:00:00Z",
      updated_at: "2026-05-31T00:00:00Z",
    };

    let captured: { name?: unknown; description?: unknown } | null = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async (input: FetchInput, init?: RequestInit) => {
        const url = requestUrl(input);
        if (url === "/projects" && init?.method === "POST") {
          captured = JSON.parse(String(init.body ?? "{}")) as Record<
            string,
            unknown
          >;
          return jsonResponse(created, { status: 201 });
        }
        return new Response(`unexpected fetch ${url}`, { status: 500 });
      },
    );

    renderPage([]);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /new project/i }));

    const dialog = await screen.findByRole("dialog");
    await user.type(
      within(dialog).getByLabelText(/^name$/i),
      created.name,
    );
    await user.type(
      within(dialog).getByLabelText(/^description/i),
      created.description,
    );
    await user.click(
      within(dialog).getByRole("button", { name: /create project/i }),
    );

    await waitFor(() => {
      expect(captured).not.toBeNull();
    });
    expect(captured).toMatchObject({
      name: created.name,
      description: created.description,
    });
  });
});
