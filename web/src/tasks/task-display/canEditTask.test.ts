import { describe, expect, it } from "vitest";
import { canEditTask } from "./canEditTask";

describe("canEditTask", () => {
  it("blocks edit while running", () => {
    expect(canEditTask("running")).toBe(false);
  });

  it("allows edit for other statuses", () => {
    expect(canEditTask("ready")).toBe(true);
    expect(canEditTask("on_hold")).toBe(true);
    expect(canEditTask("blocked")).toBe(true);
    expect(canEditTask("review")).toBe(true);
    expect(canEditTask("done")).toBe(true);
    expect(canEditTask("failed")).toBe(true);
  });
});
