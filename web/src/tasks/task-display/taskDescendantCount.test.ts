import { describe, expect, it } from "vitest";
import { taskDescendantCount } from "./taskDescendantCount";

describe("taskDescendantCount", () => {
  it("always returns 0 (flat tasks)", () => {
    expect(taskDescendantCount()).toBe(0);
  });
});
