import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ROUTER_FUTURE_FLAGS } from "../../lib/routerFutureFlags";
import { requestUrl } from "../../test/requestUrl";
import { TaskCycleDetailPage } from "./TaskCycleDetailPage";

function renderAttemptPage(initialEntry = "/tasks/t1/cycles/cyc-1") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        future={ROUTER_FUTURE_FLAGS}
        initialEntries={[initialEntry]}
      >
        <Routes>
          <Route
            path="/tasks/:taskId/cycles/:cycleId"
            element={<TaskCycleDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function multiPhaseCycleDetail() {
  return {
    ...cycleDetail,
    status: "succeeded",
    ended_at: "2026-04-25T12:00:40.000Z",
    phases: [
      {
        id: "phase-1",
        cycle_id: "cyc-1",
        phase: "execute",
        phase_seq: 1,
        status: "succeeded",
        started_at: "2026-04-25T12:00:10.000Z",
        ended_at: "2026-04-25T12:00:20.000Z",
        details: {},
      },
      {
        id: "phase-2",
        cycle_id: "cyc-1",
        phase: "verify",
        phase_seq: 2,
        status: "succeeded",
        started_at: "2026-04-25T12:00:20.000Z",
        ended_at: "2026-04-25T12:00:30.000Z",
        details: {},
      },
    ],
  };
}

function mockAttemptFetchHandlers(cyclePayload: typeof cycleDetail) {
  return async (input: RequestInfo | URL) => {
    const url = requestUrl(input);
    if (url === "/tasks/t1/cycles/cyc-1") {
      return Response.json(cyclePayload);
    }
    if (url === "/tasks/t1/cycles/cyc-1/stream?limit=500") {
      return Response.json({
        task_id: "t1",
        cycle_id: "cyc-1",
        events: [
          { ...streamEvent(1), phase_seq: 1 },
          { ...streamEvent(2), phase_seq: 2, message: "Verify stream line" },
        ],
        limit: 500,
        has_more: false,
      });
    }
    if (url === "/tasks/t1/events?limit=200") {
      return Response.json({
        task_id: "t1",
        events: [
          { seq: 1, type: "cycle_started", data: { cycle_id: "cyc-1" } },
          { seq: 2, type: "phase_started", data: { cycle_id: "cyc-1", phase_seq: 1 } },
          { seq: 3, type: "phase_started", data: { cycle_id: "cyc-1", phase_seq: 2 } },
        ],
        approval_pending: false,
      });
    }
    return new Response("not found", { status: 404 });
  };
}

const cycleDetail = {
  id: "cyc-1",
  task_id: "t1",
  attempt_seq: 3,
  status: "running",
  started_at: "2026-04-25T12:00:00.000Z",
  triggered_by: "agent",
  meta: {},
  cycle_meta: {
    runner: "cursor",
    runner_version: "1.0.0",
    cursor_model: "",
    cursor_model_effective: "auto",
    prompt_hash: "sha256:abc",
  },
  phases: [
    {
      id: "phase-2",
      cycle_id: "cyc-1",
      phase: "execute",
      phase_seq: 2,
      status: "running",
      started_at: "2026-04-25T12:00:10.000Z",
      details: {},
    },
  ],
};

function streamEvent(n: number) {
  return {
    id: `stream-${n}`,
    task_id: "t1",
    cycle_id: "cyc-1",
    phase_seq: 2,
    stream_seq: n,
    at: `2026-04-25T12:00:${String(n).padStart(2, "0")}.000Z`,
    source: "cursor",
    kind: "message",
    message: `Cursor update ${n}`,
    payload: {
      type: "assistant",
      message: { content: [{ type: "text", text: `full payload ${n}` }] },
    },
  };
}

describe("TaskCycleDetailPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pre-filters activity from ?phase= query param", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      mockAttemptFetchHandlers(multiPhaseCycleDetail()),
    );

    renderAttemptPage("/tasks/t1/cycles/cyc-1?phase=2");

    expect(
      await screen.findByRole("heading", { name: /attempt #3/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Verify", pressed: true }),
    ).toBeInTheDocument();
    const activitySection = screen.getByRole("heading", {
      name: /^activity$/i,
    }).parentElement?.parentElement;
    if (!activitySection) throw new Error("missing activity section");
    expect(within(activitySection).getByText("Verify stream line")).toBeInTheDocument();
    expect(within(activitySection).queryByText("Cursor update 1")).toBeNull();
  });

  it("clicking a phase updates the URL and filters activity", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      mockAttemptFetchHandlers(multiPhaseCycleDetail()),
    );

    renderAttemptPage();
    expect(
      await screen.findByRole("heading", { name: /attempt #3/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Verify", pressed: false }));
    expect(
      screen.getByRole("button", { name: "Verify", pressed: true }),
    ).toBeInTheDocument();
    const activitySection = screen.getByRole("heading", {
      name: /^activity$/i,
    }).parentElement?.parentElement;
    if (!activitySection) throw new Error("missing activity section");
    expect(within(activitySection).getByText("Verify stream line")).toBeInTheDocument();
    expect(within(activitySection).queryByText("Cursor update 1")).toBeNull();

    await user.click(screen.getByRole("button", { name: "All phases", pressed: false }));
    expect(
      screen.getByRole("button", { name: "All phases", pressed: true }),
    ).toBeInTheDocument();
  });
});
