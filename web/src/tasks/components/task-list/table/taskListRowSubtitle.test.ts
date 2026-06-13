import { describe, expect, it } from "vitest";
import { statusListLabel, taskListRowSubtitle } from "./taskListRowSubtitle";

describe("taskListRowSubtitle", () => {
  it("omits subtitle when project column carries context", () => {
    expect(
      taskListRowSubtitle({
        hasProject: true,
        promptPreview: "Some prompt",
      }),
    ).toBeUndefined();
  });

  it("shows prompt preview when no project", () => {
    expect(
      taskListRowSubtitle({
        hasProject: false,
        promptPreview: "  Do the thing  ",
      }),
    ).toBe("Do the thing");
  });

  it("returns undefined when there is nothing to say", () => {
    expect(
      taskListRowSubtitle({
        hasProject: false,
        promptPreview: "   ",
      }),
    ).toBeUndefined();
  });
});

describe("statusListLabel", () => {
  it("maps running to in-progress copy", () => {
    expect(statusListLabel("running")).toBe("In progress");
  });
});
