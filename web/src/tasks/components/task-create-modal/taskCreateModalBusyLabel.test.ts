import { describe, expect, it } from "vitest";
import { taskCreateModalBusyLabel } from "./taskCreateModalBusyLabel";

describe("taskCreateModalBusyLabel", () => {
  it("returns creating-task copy", () => {
    expect(taskCreateModalBusyLabel()).toBe("Creating task…");
  });
});
