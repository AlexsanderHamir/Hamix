import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  addTaskDependency,
  patchTask,
  patchTaskGate,
  removeTaskDependency,
} from "@/api";
import { errorMessage } from "@/lib/errorMessage";
import { taskQueryKeys } from "../task-query";

export function useTaskDetailScheduling(taskId: string) {
  const queryClient = useQueryClient();
  const [depAddValue, setDepAddValue] = useState("");
  const [tagsDraft, setTagsDraft] = useState("");
  const [milestoneDraft, setMilestoneDraft] = useState("");

  const invalidateTask = async () => {
    await queryClient.invalidateQueries({ queryKey: taskQueryKeys.all });
  };

  const addDepMutation = useMutation({
    mutationFn: () => addTaskDependency(taskId, depAddValue.trim()),
    onSuccess: async () => {
      setDepAddValue("");
      await invalidateTask();
    },
  });

  const removeDepMutation = useMutation({
    mutationFn: (dependsOnTaskId: string) =>
      removeTaskDependency(taskId, dependsOnTaskId),
    onSuccess: invalidateTask,
  });

  const gateMutation = useMutation({
    mutationFn: (action: "release" | "hold" | "clear_hold") =>
      patchTaskGate(taskId, action),
    onSuccess: invalidateTask,
  });

  const tagsMutation = useMutation({
    mutationFn: (tags: string[]) =>
      patchTask(taskId, {
        tags: tags.map((t) => t.trim()).filter(Boolean),
      }),
    onSuccess: invalidateTask,
  });

  const milestoneMutation = useMutation({
    mutationFn: (milestone: string | null) =>
      patchTask(taskId, {
        milestone: milestone === "" ? null : milestone,
      }),
    onSuccess: invalidateTask,
  });

  return {
    depAddValue,
    setDepAddValue,
    tagsDraft,
    setTagsDraft,
    milestoneDraft,
    setMilestoneDraft,
    addDepMutation,
    removeDepMutation,
    gateMutation,
    tagsMutation,
    milestoneMutation,
    schedulingError: [
      addDepMutation.error,
      removeDepMutation.error,
      gateMutation.error,
      tagsMutation.error,
      milestoneMutation.error,
    ]
      .map((e) => (e ? errorMessage(e) : null))
      .find(Boolean),
  };
}
