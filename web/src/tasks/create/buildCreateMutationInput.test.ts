import { describe, expect, it } from "vitest";
import { buildCreateTaskMutationInput } from "./buildCreateMutationInput";
import type { TaskCreateFormFields } from "./types";

const baseFields: TaskCreateFormFields = {
  newTitle: "Task",
  newPrompt: "Do work",
  newPriority: "medium",
  newTaskRunner: "cursor",
  newTaskCursorModel: "",
  newProjectID: "",
  newProjectContextItemIDs: [],
  newSchedule: "",
  newAutonomyEnabled: true,
  newTagsCsv: "",
  newMilestone: "",
  newDependsOn: [],
  newWorktreeID: "",
  newBranchID: "",
  newWorktreeBranchID: "",
  newChecklistItems: [],
  newDraftID: "",
};

describe("buildCreateTaskMutationInput", () => {
  it("includes worktree_branch_id when set on the form", () => {
    const wbID = "00000000-0000-4000-8000-000000000040";
    const input = buildCreateTaskMutationInput({
      ...baseFields,
      newWorktreeBranchID: wbID,
    });
    expect(input.worktree_branch_id).toBe(wbID);
  });

  it("passes empty worktree_branch_id when unset", () => {
    const input = buildCreateTaskMutationInput(baseFields);
    expect(input.worktree_branch_id).toBe("");
  });
});
