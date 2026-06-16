import {
  ProjectContextPicker,
  ProjectSelect,
  useProjectContextPromptBinding,
  useProjects,
} from "@/projects";
import { AutomationPicker } from "@/automations/AutomationPicker";
import { useAppTimezone } from "@/shared/time/appTimezone";
import { DraftResumeModal } from "../components/draft-resume";
import { TaskCreateModal } from "../components/task-create-modal";
import type { useTasksApp } from "../hooks/useTasksApp";

type Props = {
  app: ReturnType<typeof useTasksApp>;
};

const noopChecklistAppend = (): void => {};
const noopChecklistUpdate = (): void => {};
const noopChecklistRemove = (): void => {};
const noopSaveDraft = (): void => {};
const noopEvaluate = (): void => {};

export function TaskCreateModalsLayer({ app }: Props) {
  const appTimezone = useAppTimezone();
  const projectsEnabled = app.createModalOpen || app.editing !== null;
  const projects = useProjects({
    includeArchived: false,
    limit: 100,
    enabled: projectsEnabled,
  });
  const newPromptProjectContext = useProjectContextPromptBinding({
    projectId: app.createModalOpen ? app.newProjectID : "",
    selectedIds: app.newProjectContextItemIDs,
    onSelectedIdsChange: app.setNewProjectContextItemIDs,
  });
  const editPromptProjectContext = useProjectContextPromptBinding({
    projectId: app.editing ? app.editProjectID : "",
    selectedIds: app.editProjectContextItemIDs,
    onSelectedIdsChange: app.setEditProjectContextItemIDs,
  });

  const assignmentControlsDisabled =
    app.saving || app.createModalAssignmentLocked;

  const handleResumeDraft = (id: string) => {
    void app.resumeDraftByID(id).catch(() => {
      // Error state is exposed by the hook and rendered in the modal.
    });
  };

  return (
    <>
      {app.createEntryDraftErrorHint ? (
        <div className="err error-banner" role="alert">
          <span className="error-banner__text">
            Saved drafts are unavailable right now, so a fresh task form was opened.
          </span>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              void app.retryCreateEntryDraftLoad();
            }}
          >
            Retry loading drafts
          </button>
        </div>
      ) : null}
      {app.createModalOpen ? (
        <TaskCreateModal
          pending={app.createPending}
          saving={app.saving}
          draftSaving={app.draftSavePending}
          draftSaveLabel={app.draftSaveLabel}
          draftSaveError={app.draftSaveError}
          onClose={app.closeCreateModal}
          title={app.newTitle}
          prompt={app.newPrompt}
          priority={app.newPriority}
          checklistItems={app.newChecklistItems}
          onTitleChange={app.setNewTitle}
          onPromptChange={app.setNewPrompt}
          onPriorityChange={app.setNewPriority}
          onAppendChecklistCriterion={app.appendNewChecklistCriterion}
          onUpdateChecklistRow={app.updateNewChecklistRow}
          onRemoveChecklistRow={app.removeNewChecklistRow}
          evaluatePending={app.evaluatePending}
          evaluation={app.latestDraftEvaluation}
          taskRunner={app.newTaskRunner}
          taskCursorModel={app.newTaskCursorModel}
          onTaskRunnerChange={app.setNewTaskRunner}
          onTaskCursorModelChange={app.setNewTaskCursorModel}
          projectAssignment={
            <section
              className="task-create-project"
              aria-label="Project assignment"
            >
              <ProjectSelect
                id="task-create-project"
                value={app.newProjectID}
                projects={projects.data?.projects ?? []}
                loading={projects.isLoading}
                disabled={assignmentControlsDisabled}
                onChange={(projectId) => {
                  app.setNewProjectID(projectId);
                  app.setNewProjectContextItemIDs([]);
                }}
              />
              <ProjectContextPicker
                projectId={app.newProjectID}
                selectedIds={app.newProjectContextItemIDs}
                disabled={app.saving}
                compact
                onChange={app.setNewProjectContextItemIDs}
              />
            </section>
          }
          automationAssignment={
            <AutomationPicker
              selections={app.newAutomationSelections}
              disabled={app.saving}
              compact
              onChange={app.setNewAutomationSelections}
            />
          }
          promptProjectContext={newPromptProjectContext ?? undefined}
          schedule={app.newSchedule}
          onScheduleChange={app.setNewSchedule}
          autonomyEnabled={app.newAutonomyEnabled}
          onAutonomyChange={app.setNewAutonomyEnabled}
          tagsCsv={app.newTagsCsv}
          milestone={app.newMilestone}
          projectId={app.newProjectID}
          dependsOn={app.newDependsOn}
          onTagsCsvChange={app.setNewTagsCsv}
          onMilestoneChange={app.setNewMilestone}
          onDependsOnChange={app.setNewDependsOn}
          appTimezone={appTimezone}
          onSaveDraft={() => void app.saveDraftNow()}
          onEvaluate={() => void app.evaluateDraftBeforeCreate()}
          onSubmit={(e) => void app.submitCreate(e)}
          createError={app.createError}
          createFormError={app.createFormError}
          evaluateError={app.evaluateError}
          onApplyTestScenario={app.applyTestScenario}
        />
      ) : null}
      {app.editing ? (
        <TaskCreateModal
          mode="edit"
          taskId={app.editing.id}
          status={app.editStatus}
          onStatusChange={app.setEditStatus}
          patchPending={app.patchPending}
          patchError={app.patchError}
          formError={app.editFormError}
          pending={false}
          saving={app.saving}
          draftSaving={false}
          draftSaveLabel={null}
          draftSaveError={false}
          onClose={app.closeEdit}
          title={app.editTitle}
          prompt={app.editPrompt}
          priority={app.editPriority}
          checklistItems={[]}
          onTitleChange={app.setEditTitle}
          onPromptChange={app.setEditPrompt}
          onPriorityChange={app.setEditPriority}
          onAppendChecklistCriterion={noopChecklistAppend}
          onUpdateChecklistRow={noopChecklistUpdate}
          onRemoveChecklistRow={noopChecklistRemove}
          evaluatePending={false}
          evaluation={null}
          taskRunner={app.editing.runner}
          taskCursorModel={app.editCursorModel}
          onTaskRunnerChange={() => {}}
          onTaskCursorModelChange={app.setEditCursorModel}
          projectAssignment={
            <section
              className="task-create-project"
              aria-label="Project assignment"
            >
              <ProjectSelect
                id="task-edit-project"
                value={app.editProjectID}
                projects={projects.data?.projects ?? []}
                loading={projects.isLoading}
                disabled={app.saving}
                onChange={(projectId) => {
                  app.setEditProjectID(projectId);
                  app.setEditProjectContextItemIDs([]);
                }}
              />
              <ProjectContextPicker
                projectId={app.editProjectID}
                selectedIds={app.editProjectContextItemIDs}
                disabled={app.saving}
                onChange={app.setEditProjectContextItemIDs}
              />
            </section>
          }
          promptProjectContext={editPromptProjectContext ?? undefined}
          schedule={app.editPickupSchedule}
          onScheduleChange={app.setEditPickupSchedule}
          autonomyEnabled={false}
          onAutonomyChange={() => {}}
          tagsCsv={app.editTagsCsv}
          milestone={app.editMilestone}
          projectId={app.editProjectID}
          dependsOn={[]}
          onTagsCsvChange={app.setEditTagsCsv}
          onMilestoneChange={app.setEditMilestone}
          onDependsOnChange={() => {}}
          appTimezone={appTimezone}
          onSaveDraft={noopSaveDraft}
          onEvaluate={noopEvaluate}
          onSubmit={(e) => void app.submitEdit(e)}
        />
      ) : null}
      {app.draftPickerOpen ? (
        <DraftResumeModal
          drafts={app.taskDrafts}
          onClose={() => app.setDraftPickerOpen(false)}
          onStartFresh={() => void app.startFreshDraft()}
          onResume={handleResumeDraft}
          loading={app.draftListLoading}
          loadError={app.draftListError}
          onRetryLoad={() => {
            void app.retryDraftList();
          }}
          resumePending={app.resumeDraftPending}
          resumeError={app.resumeDraftError}
        />
      ) : null}
    </>
  );
}
