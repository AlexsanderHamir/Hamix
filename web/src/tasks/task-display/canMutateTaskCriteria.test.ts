import { describe, expect, it } from "vitest";
import {
  canEditChecklistItem,
  canMutateTaskCriteria,
} from "./canMutateTaskCriteria";

describe("canMutateTaskCriteria", () => {
  it("blocks mutations while running", () => {
    expect(canMutateTaskCriteria("running")).toBe(false);
  });

  it("allows mutations for done and other non-running statuses", () => {
    expect(canMutateTaskCriteria("done")).toBe(true);
    expect(canMutateTaskCriteria("ready")).toBe(true);
    expect(canMutateTaskCriteria("failed")).toBe(true);
  });
});

describe("canEditChecklistItem", () => {
  it("blocks all rows while running", () => {
    expect(canEditChecklistItem("running", false)).toBe(false);
    expect(canEditChecklistItem("running", true)).toBe(false);
  });

  it("allows editing satisfied criteria when the task is done", () => {
    expect(canEditChecklistItem("done", true)).toBe(true);
    expect(canEditChecklistItem("done", false)).toBe(true);
  });

  it("locks satisfied criteria while the task is still active", () => {
    expect(canEditChecklistItem("ready", true)).toBe(false);
    expect(canEditChecklistItem("ready", false)).toBe(true);
  });
});
