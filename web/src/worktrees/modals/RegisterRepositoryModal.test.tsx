import { type ComponentProps } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ModalStackProvider } from "@/shared/ModalStackContext";
import { RegisterRepositoryModal } from "./RegisterRepositoryModal";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function renderModal(props: Partial<ComponentProps<typeof RegisterRepositoryModal>> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const onSubmit = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <ModalStackProvider>
        <RegisterRepositoryModal
          open
          pending={false}
          error={null}
          onClose={() => {}}
          onSubmit={onSubmit}
          {...props}
        />
      </ModalStackProvider>
    </QueryClientProvider>,
  );
  return { onSubmit };
}

describe("RegisterRepositoryModal", () => {
  it("shows branch dropdown after selecting a git checkout", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/settings/workspace-roots")) {
        return jsonResponse({
          environment: "native",
          roots: [{ id: "home", path: "/roots", label: "Home", category: "home", available: true }],
        });
      }
      if (url.includes("/settings/browse-dirs")) {
        return jsonResponse({
          path: "/roots/repo",
          parent_path: "/roots",
          is_git_repo: true,
          entries: [],
        });
      }
      if (url.includes("/settings/git-probe")) {
        return jsonResponse({
          path: "/roots/repo",
          is_git_repository: true,
          current_branch: "main",
          branches: [
            { name: "main", head_sha: "abc" },
            { name: "develop", head_sha: "def" },
          ],
        });
      }
      return new Response("not found", { status: 404 });
    });

    renderModal();

    await userEvent.click(screen.getByRole("button", { name: /Choose folder/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Home/ }));
    await userEvent.click(screen.getByRole("button", { name: /Use this folder/ }));

    expect(await screen.findByText(/Git repository detected/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/Pick an existing branch from this checkout/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Default branch/i })).toHaveTextContent(
      "main (checked out)",
    );

    fetchMock.mockRestore();
  });
});
