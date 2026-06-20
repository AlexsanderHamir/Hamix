import { useCallback, type FormEvent } from "react";
import { buildCreateTaskMutationInput } from "../buildCreateMutationInput";
import { validateCreateFormChecklist } from "../validateCreateForm";
import type { useTaskCreateFormState } from "./useTaskCreateFormState";
import type { useTaskCreateModalState } from "./useTaskCreateModalState";
import type { useTaskCreateMutations } from "./useTaskCreateMutations";

export function useTaskCreateSubmitActions(input: {
  form: ReturnType<typeof useTaskCreateFormState>;
  modal: ReturnType<typeof useTaskCreateModalState>;
  mutations: ReturnType<typeof useTaskCreateMutations>;
}) {
  const submitCreate = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateCreateFormChecklist(
      input.form.newTitle,
      input.form.newPriority,
      input.form.newChecklistItems,
    );
    if (!input.form.newTitle.trim() || !input.form.newPriority) return;
    if (validationError) {
      input.form.setCreateFormError(validationError);
      return;
    }
    input.form.setCreateFormError(null);
    input.mutations.createMutation.mutate(buildCreateTaskMutationInput(input.form.formFields));
  }, [input]);

  const submitTemplate = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateCreateFormChecklist(
      input.form.newTitle,
      input.form.newPriority,
      input.form.newChecklistItems,
    );
    if (!input.form.newTitle.trim() || !input.form.newPriority) return;
    if (validationError) {
      input.form.setCreateFormError(validationError);
      return;
    }
    input.form.setCreateFormError(null);
    const name = input.form.newTitle.trim();
    const fields = input.form.formFields;
    if (input.modal.composeOperation === "edit" && input.modal.editingTemplateId) {
      input.mutations.patchTemplateMutation.mutate({
        id: input.modal.editingTemplateId,
        name,
        fields,
      });
      return;
    }
    input.mutations.saveTemplateMutation.mutate({
      name,
      fields,
    });
  }, [input]);

  return {
    submitCreate,
    submitTemplate,
  };
}
