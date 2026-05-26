import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TaskDependenciesPanel } from "./TaskDependenciesPanel";

describe("TaskDependenciesPanel", () => {
  it("shows empty state when there are no dependencies", () => {
    render(
      <MemoryRouter>
        <TaskDependenciesPanel taskId="t1" dependencies={[]} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("task-deps-empty")).toBeInTheDocument();
  });

  it("lists dependencies with status pills", () => {
    render(
      <MemoryRouter>
        <TaskDependenciesPanel
          taskId="t1"
          dependencies={[
            { id: "d1", title: "Upstream", status: "done" },
            { id: "d2", title: "Blocker", status: "running" },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("task-deps-list")).toBeInTheDocument();
    expect(screen.getByText("Upstream")).toBeInTheDocument();
    expect(screen.getByText("done")).toBeInTheDocument();
    expect(screen.getByText("running")).toBeInTheDocument();
  });
});
