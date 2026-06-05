import { describe, expect, it } from "vitest";
import type { TaskEvent } from "@/types";
import {
  formatEventSummaryCompact,
  formatPhaseSummaryCompact,
} from "./taskEventSummary";

function ev(
  partial: Pick<TaskEvent, "type" | "data"> & Partial<TaskEvent>,
): TaskEvent {
  return {
    seq: 1,
    at: "2026-01-01T12:00:00.000Z",
    by: "agent",
    ...partial,
  };
}

describe("formatEventSummaryCompact", () => {
  it("formats status transitions without JSON", () => {
    expect(
      formatEventSummaryCompact(
        ev({
          type: "status_changed",
          data: { from: "running", to: "done" },
        }),
      ),
    ).toBe("running → done");
  });

  it("omits bare terminal status when the event label already conveys outcome", () => {
    expect(
      formatEventSummaryCompact(
        ev({
          type: "cycle_completed",
          data: {
            status: "succeeded",
            cycle_id: "c1",
            attempt_seq: 1,
          },
        }),
      ),
    ).toBeNull();
    expect(
      formatEventSummaryCompact(
        ev({
          type: "phase_completed",
          data: {
            phase: "execute",
            status: "succeeded",
            cycle_id: "c1",
            phase_seq: 2,
          },
        }),
      ),
    ).toBeNull();
  });

  it("surfaces cycle failure reason when present", () => {
    expect(
      formatEventSummaryCompact(
        ev({
          type: "cycle_failed",
          data: {
            status: "failed",
            cycle_id: "c1",
            attempt_seq: 1,
            reason: "execute phase timed out",
          },
        }),
      ),
    ).toBe("execute phase timed out");
  });

  it("returns null when there is nothing human-readable to show", () => {
    expect(
      formatEventSummaryCompact(
        ev({
          type: "sync_ping",
          data: { cycle_id: "c1" },
        }),
      ),
    ).toBeNull();
  });
});

describe("formatPhaseSummaryCompact", () => {
  it("strips markdown headers and inline code from the first line", () => {
    expect(
      formatPhaseSummaryCompact(
        "## Hottest path: `GET /tasks` (`Handler.list`)\n\nThis is the highest-traffic read.",
      ),
    ).toBe("Hottest path: GET /tasks (Handler.list)");
  });

  it("returns null for blank summaries", () => {
    expect(formatPhaseSummaryCompact("   ")).toBeNull();
  });
});
