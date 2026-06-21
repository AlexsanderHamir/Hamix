import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceDirPickerModal } from "./WorkspaceDirPickerModal";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("WorkspaceDirPickerModal", () => {
  it("loads roots and selects a folder", async () => {
    const onSelect = vi.fn();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/settings/workspace-roots")) {
        return jsonResponse({
          environment: "native",
          roots: [{ id: "home", path: "/roots", label: "Home", available: true }],
        });
      }
      if (url.includes("/settings/browse-dirs")) {
        return jsonResponse({
          entries: [
            {
              name: "my-app",
              path: "/roots/my-app",
              has_children: false,
              is_git_repo: true,
            },
          ],
        });
      }
      return new Response("not found", { status: 404 });
    });

    render(
      <WorkspaceDirPickerModal
        open
        currentPath=""
        onClose={() => {}}
        onSelect={onSelect}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("my-app")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("my-app"));
    await userEvent.click(screen.getByRole("button", { name: /Use this folder/ }));

    expect(onSelect).toHaveBeenCalledWith("/roots/my-app");
    fetchMock.mockRestore();
  });
});
