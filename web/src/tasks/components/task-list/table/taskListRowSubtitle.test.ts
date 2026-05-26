import { describe, expect, it } from "vitest";
import { statusListLabel, taskListRowSubtitle } from "./taskListRowSubtitle";

describe("taskListRowSubtitle", () => {
  it("omits subtitle when project column carries context", () => {
    expect(
      taskListRowSubtitle({
        depth: 0,
        hasProject: true,
        promptPreview: "Some prompt",
      }),
    ).toBeUndefined();
  });

  it("shows subtask under project without repeating the name", () => {
    expect(
      taskListRowSubtitle({
        depth: 1,
        hasProject: true,
        promptPreview: "",
      }),
    ).toBe("Subtask");
  });

  it("shows subtask and prompt preview when no project", () => {
    expect(
      taskListRowSubtitle({
        depth: 1,
        hasProject: false,
        promptPreview: "  Do the thing  ",
      }),
    ).toBe("Subtask · Do the thing");
  });

  it("returns undefined when there is nothing to say", () => {
    expect(
      taskListRowSubtitle({
        depth: 0,
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
