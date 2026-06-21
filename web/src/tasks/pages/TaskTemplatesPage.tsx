import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listTaskTemplates, maxTemplateInstantiateCountPerItem } from "@/api";
import { TASK_TIMINGS } from "@/constants/tasks";
import { useDelayedTrue } from "@/lib/useDelayedTrue";
import { EmptyState } from "@/shared/EmptyState";
import { useDocumentTitle } from "@/shared/useDocumentTitle";
import { formatRelativeTime } from "@/shared/time/relativeTime";
import { useNavigate } from "react-router-dom";
import { TaskListDeleteGlyph, TaskListEditGlyph } from "../components/task-list/table/TaskListRowActionIcons";
import { TaskDraftsListSkeleton } from "../components/skeletons";
import { useTasksAppContext } from "../app/TasksAppProvider";
import { taskQueryKeys } from "../task-query";
import type { Task, TaskTemplateSummary } from "@/types";

type InstantiateTemplatesBatchResult = {
  tasks: Task[];
  errors: { template_id: string; error: string }[];
};

function isTemplateRowActionExcluded(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  return Boolean(target.closest("button, input, label"));
}

function useDebouncedTrimmedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value.trim());

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value.trim()), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

function clampInstanceCount(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(
    maxTemplateInstantiateCountPerItem,
    Math.max(1, Math.floor(value)),
  );
}

function sumSelectedInstanceCounts(
  selectedIds: string[],
  instanceCounts: Record<string, number>,
  batchDefaultCount: number,
): number {
  return selectedIds.reduce(
    (sum, id) => sum + (instanceCounts[id] ?? batchDefaultCount),
    0,
  );
}

function formatInstantiateTemplatesBatchError(result: InstantiateTemplatesBatchResult): string | null {
  if (result.errors.length > 0 && result.tasks.length === 0) {
    return result.errors.map((entry) => `${entry.template_id}: ${entry.error}`).join(" ");
  }
  if (result.errors.length > 0) {
    return `Created ${result.tasks.length} task(s). Failed: ${result.errors
      .map((entry) => entry.template_id)
      .join(", ")}`;
  }
  return null;
}

type TemplateBatchBarProps = {
  selectedCount: number;
  totalTaskCount: number;
  batchDefaultCount: number;
  instantiatePending: boolean;
  onBatchDefaultCountChange: (count: number) => void;
  onApplyToAll: () => void;
  onCreate: () => void;
};

function TemplateBatchBar({
  selectedCount,
  totalTaskCount,
  batchDefaultCount,
  instantiatePending,
  onBatchDefaultCountChange,
  onApplyToAll,
  onCreate,
}: TemplateBatchBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="template-batch-bar" role="region" aria-label="Batch actions">
      <span className="template-batch-bar__count">{selectedCount} selected</span>
      <div className="template-batch-bar__instances">
        <label htmlFor="template-batch-default-count" className="template-batch-bar__instances-label">
          Instances per template
        </label>
        <input
          id="template-batch-default-count"
          type="number"
          className="template-batch-bar__instances-input"
          min={1}
          max={maxTemplateInstantiateCountPerItem}
          inputMode="numeric"
          value={batchDefaultCount}
          onChange={(e) => {
            const parsed = Number.parseInt(e.target.value, 10);
            onBatchDefaultCountChange(clampInstanceCount(Number.isNaN(parsed) ? 1 : parsed));
          }}
        />
        <button
          type="button"
          className="secondary template-batch-bar__apply"
          disabled={instantiatePending}
          onClick={onApplyToAll}
        >
          Apply to all selected
        </button>
      </div>
      <button
        type="button"
        className="task-create-submit"
        disabled={instantiatePending}
        onClick={onCreate}
      >
        {instantiatePending ? "Creating tasks…" : `Create tasks (${totalTaskCount})`}
      </button>
    </div>
  );
}

type TemplateSearchToolbarProps = {
  searchInput: string;
  onSearchChange: (value: string) => void;
  onNewTemplate: () => void;
};

function TemplateSearchToolbar({
  searchInput,
  onSearchChange,
  onNewTemplate,
}: TemplateSearchToolbarProps) {
  return (
    <div className="task-list-toolbar">
      <header className="task-list-section-head">
        <div className="task-list-section-head__text">
          <h2 id="task-templates-heading" className="task-list-section-title">
            Task templates
          </h2>
        </div>
        <div className="task-list-section-actions">
          <button type="button" className="secondary" onClick={onNewTemplate}>
            New template
          </button>
        </div>
      </header>

      <div
        className="task-templates-search field grow task-list-search-field"
        role="search"
        aria-label="Search templates"
      >
        <label htmlFor="task-templates-search" className="visually-hidden">
          Search templates
        </label>
        <input
          id="task-templates-search"
          type="search"
          placeholder="Search by title…"
          autoComplete="off"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function TemplateRowActions({
  templateName,
  isDeleting,
  rowDisabled,
  onEdit,
  onDelete,
}: {
  templateName: string;
  isDeleting: boolean;
  rowDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="draft-row__actions">
      <div className="task-list-row-actions">
        <button
          type="button"
          className="task-list-icon-btn task-list-icon-btn--edit"
          aria-label={`Edit template "${templateName}"`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          disabled={rowDisabled}
        >
          <TaskListEditGlyph />
        </button>
        <button
          type="button"
          className="task-list-icon-btn task-list-icon-btn--delete"
          aria-label={
            isDeleting
              ? `Deleting template "${templateName}"`
              : `Delete template "${templateName}"`
          }
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={rowDisabled}
          aria-busy={isDeleting || undefined}
        >
          <TaskListDeleteGlyph />
        </button>
      </div>
    </div>
  );
}

type TemplateRowProps = {
  template: TaskTemplateSummary;
  isSelected: boolean;
  instanceCount: number;
  isDeleting: boolean;
  isExiting: boolean;
  rowDisabled: boolean;
  renderNow: Date;
  onToggleSelected: (id: string) => void;
  onInstanceCountChange: (id: string, count: number) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

function TemplateRow({
  template,
  isSelected,
  instanceCount,
  isDeleting,
  isExiting,
  rowDisabled,
  renderNow,
  onToggleSelected,
  onInstanceCountChange,
  onEdit,
  onDelete,
}: TemplateRowProps) {
  const lastEdited = template.updated_at || template.created_at;
  const relative = formatRelativeTime(lastEdited, renderNow);

  return (
    <li
      className={[
        "draft-row",
        "template-row",
        isSelected ? "template-row--selected" : "",
        rowDisabled ? "" : "draft-row--interactive",
        isExiting ? "draft-row--exit" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={(e) => {
        if (rowDisabled || isTemplateRowActionExcluded(e.target)) return;
        onToggleSelected(template.id);
      }}
      onKeyDown={(e) => {
        if (rowDisabled || isTemplateRowActionExcluded(e.target)) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggleSelected(template.id);
        }
      }}
      tabIndex={rowDisabled ? undefined : 0}
      aria-label={`Template: ${template.name}`}
      aria-selected={isSelected}
    >
      <div className="task-list-select-col">
        <input
          type="checkbox"
          className="task-list-select-checkbox"
          checked={isSelected}
          aria-label={`Select ${template.name}`}
          onChange={() => onToggleSelected(template.id)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="draft-row__meta">
        <span className="draft-row__name" title={template.name}>
          {template.name}
        </span>
        {lastEdited && relative ? (
          <time className="draft-row__time" dateTime={lastEdited} title={lastEdited}>
            Updated {relative}
          </time>
        ) : null}
      </div>
      {isSelected ? (
        <div className="template-row__qty">
          <label htmlFor={`template-qty-${template.id}`} className="visually-hidden">
            Instances for {template.name}
          </label>
          <input
            id={`template-qty-${template.id}`}
            type="number"
            className="template-row__qty-input"
            min={1}
            max={maxTemplateInstantiateCountPerItem}
            inputMode="numeric"
            aria-label={`Instances for ${template.name}`}
            value={instanceCount}
            disabled={rowDisabled}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              onInstanceCountChange(
                template.id,
                clampInstanceCount(Number.isNaN(parsed) ? 1 : parsed),
              );
            }}
          />
        </div>
      ) : (
        <div className="template-row__qty template-row__qty--placeholder" aria-hidden="true" />
      )}
      <TemplateRowActions
        templateName={template.name}
        isDeleting={isDeleting}
        rowDisabled={rowDisabled}
        onEdit={() => onEdit(template.id)}
        onDelete={() => onDelete(template.id)}
      />
    </li>
  );
}

type TemplateListBodyProps = {
  templates: TaskTemplateSummary[];
  debouncedQ: string;
  selectedIds: string[];
  instanceCounts: Record<string, number>;
  batchDefaultCount: number;
  allSelected: boolean;
  deletingTemplateId: string | null;
  exitingTemplateIds: string[];
  loadTemplatePending: boolean;
  deleteTemplatePending: boolean;
  renderNow: Date;
  onToggleSelectAll: () => void;
  onToggleSelected: (id: string) => void;
  onInstanceCountChange: (id: string, count: number) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

function TemplateListBody({
  templates,
  debouncedQ,
  selectedIds,
  instanceCounts,
  batchDefaultCount,
  allSelected,
  deletingTemplateId,
  exitingTemplateIds,
  loadTemplatePending,
  deleteTemplatePending,
  renderNow,
  onToggleSelectAll,
  onToggleSelected,
  onInstanceCountChange,
  onEdit,
  onDelete,
}: TemplateListBodyProps) {
  if (templates.length === 0) {
    return (
      <EmptyState
        title={debouncedQ ? "No matching templates" : "No templates yet"}
        description={debouncedQ ? "Try a different search term." : undefined}
        className="empty-state--task-list-fresh"
      />
    );
  }

  return (
    <div className="template-list">
      <div className="template-list-head" role="row">
        <div className="task-list-select-col template-list-head__select">
          <input
            type="checkbox"
            className="task-list-select-checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            aria-label={allSelected ? "Deselect all templates" : "Select all templates"}
            data-testid="template-list-select-all"
          />
        </div>
        <span className="template-list-head__label" role="columnheader">Title</span>
        <span
          className="template-list-head__label template-list-head__label--qty"
          role="columnheader"
        >
          Qty
        </span>
        <span
          className="template-list-head__label template-list-head__label--actions"
          role="columnheader"
        >
          Actions
        </span>
      </div>
      <ul className="draft-row-list template-list-rows" aria-label="Task templates">
        {templates.map((template) => {
          const isSelected = selectedIds.includes(template.id);
          const isDeleting = deletingTemplateId === template.id;
          const isExiting = exitingTemplateIds.includes(template.id);
          const rowDisabled =
            loadTemplatePending ||
            deleteTemplatePending ||
            isExiting;

          return (
            <TemplateRow
              key={template.id}
              template={template}
              isSelected={isSelected}
              instanceCount={instanceCounts[template.id] ?? batchDefaultCount}
              isDeleting={isDeleting}
              isExiting={isExiting}
              rowDisabled={rowDisabled}
              renderNow={renderNow}
              onToggleSelected={onToggleSelected}
              onInstanceCountChange={onInstanceCountChange}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          );
        })}
      </ul>
    </div>
  );
}

type TaskTemplatesApp = ReturnType<typeof useTasksAppContext>;

function useTaskTemplatesPageModel(app: TaskTemplatesApp, navigate: ReturnType<typeof useNavigate>) {
  const [searchInput, setSearchInput] = useState("");
  const debouncedQ = useDebouncedTrimmedValue(searchInput, 300);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDefaultCount, setBatchDefaultCount] = useState(1);
  const [instanceCounts, setInstanceCounts] = useState<Record<string, number>>({});
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [exitingTemplateIds, setExitingTemplateIds] = useState<string[]>([]);
  const [batchError, setBatchError] = useState<string | null>(null);
  const deleteTimerRef = useRef<number | null>(null);

  const templatesQuery = useQuery({
    queryKey: taskQueryKeys.templates(debouncedQ ? { q: debouncedQ } : undefined),
    queryFn: ({ signal }) => listTaskTemplates({ q: debouncedQ || undefined, signal }),
  });

  const templates = templatesQuery.data ?? [];
  const loading = templatesQuery.isPending;
  const error = templatesQuery.isError
    ? templatesQuery.error instanceof Error
      ? templatesQuery.error.message
      : "Could not load templates."
    : null;
  const showSkeleton = useDelayedTrue(loading, TASK_TIMINGS.draftResumeMinLoadingMs);
  const renderNow = new Date();

  useEffect(() => {
    const ids = new Set(templates.map((t) => t.id));
    setSelectedIds((current) => current.filter((id) => ids.has(id)));
    setExitingTemplateIds((current) => current.filter((id) => ids.has(id)));
    setInstanceCounts((current) => {
      const next: Record<string, number> = {};
      for (const [id, count] of Object.entries(current)) {
        if (ids.has(id)) next[id] = count;
      }
      return next;
    });
  }, [templates]);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current !== null) {
        window.clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  const allSelected = templates.length > 0 && selectedIds.length === templates.length;
  const selectedCount = selectedIds.length;
  const totalTaskCount = sumSelectedInstanceCounts(selectedIds, instanceCounts, batchDefaultCount);

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        setInstanceCounts((counts) => {
          const next = { ...counts };
          delete next[id];
          return next;
        });
        return current.filter((value) => value !== id);
      }
      setInstanceCounts((counts) => ({
        ...counts,
        [id]: batchDefaultCount,
      }));
      return [...current, id];
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      setInstanceCounts({});
      return;
    }
    const ids = templates.map((t) => t.id);
    setSelectedIds(ids);
    setInstanceCounts(
      Object.fromEntries(ids.map((id) => [id, batchDefaultCount])),
    );
  };

  const setInstanceCountForTemplate = (id: string, count: number) => {
    setInstanceCounts((current) => ({
      ...current,
      [id]: clampInstanceCount(count),
    }));
  };

  const applyBatchDefaultToSelected = () => {
    setInstanceCounts((current) => {
      const next = { ...current };
      for (const id of selectedIds) {
        next[id] = batchDefaultCount;
      }
      return next;
    });
  };

  const deleteTemplate = async (templateId: string) => {
    setDeletingTemplateId(templateId);
    setExitingTemplateIds((current) =>
      current.includes(templateId) ? current : [...current, templateId],
    );
    await new Promise<void>((resolve) => {
      deleteTimerRef.current = window.setTimeout(() => {
        deleteTimerRef.current = null;
        resolve();
      }, TASK_TIMINGS.draftDeleteExitMs);
    });
    try {
      await app.deleteTemplateByID(templateId);
      setSelectedIds((current) => current.filter((id) => id !== templateId));
    } catch {
      setExitingTemplateIds((current) => current.filter((id) => id !== templateId));
    } finally {
      setDeletingTemplateId((current) => (current === templateId ? null : current));
    }
  };

  const runBatchCreate = async () => {
    if (selectedIds.length === 0) return;
    setBatchError(null);
    try {
      const items = selectedIds.map((id) => ({
        template_id: id,
        count: instanceCounts[id] ?? batchDefaultCount,
      }));
      const result = await app.instantiateTemplates(items);
      const batchMessage = formatInstantiateTemplatesBatchError(result);
      if (batchMessage !== null) {
        setBatchError(batchMessage);
        if (result.errors.length > 0 && result.tasks.length > 0) {
          setSelectedIds([...new Set(result.errors.map((entry) => entry.template_id))]);
        }
        return;
      }
      setSelectedIds([]);
      setInstanceCounts({});
      navigate("/");
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : "Could not create tasks from templates.");
    }
  };

  return {
    searchInput,
    setSearchInput,
    debouncedQ,
    selectedIds,
    batchDefaultCount,
    setBatchDefaultCount,
    instanceCounts,
    deletingTemplateId,
    exitingTemplateIds,
    batchError,
    templatesQuery,
    templates,
    loading,
    error,
    showSkeleton,
    renderNow,
    allSelected,
    selectedCount,
    totalTaskCount,
    toggleSelected,
    toggleSelectAll,
    setInstanceCountForTemplate,
    applyBatchDefaultToSelected,
    deleteTemplate,
    runBatchCreate,
  };
}

type TemplatePageContentProps = {
  loading: boolean;
  showSkeleton: boolean;
  error: string | null;
  onRetry: () => void;
  templates: TaskTemplateSummary[];
  debouncedQ: string;
  selectedIds: string[];
  instanceCounts: Record<string, number>;
  batchDefaultCount: number;
  allSelected: boolean;
  deletingTemplateId: string | null;
  exitingTemplateIds: string[];
  loadTemplatePending: boolean;
  deleteTemplatePending: boolean;
  renderNow: Date;
  onToggleSelectAll: () => void;
  onToggleSelected: (id: string) => void;
  onInstanceCountChange: (id: string, count: number) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

function TemplatePageContent({
  loading,
  showSkeleton,
  error,
  onRetry,
  templates,
  debouncedQ,
  selectedIds,
  instanceCounts,
  batchDefaultCount,
  allSelected,
  deletingTemplateId,
  exitingTemplateIds,
  loadTemplatePending,
  deleteTemplatePending,
  renderNow,
  onToggleSelectAll,
  onToggleSelected,
  onInstanceCountChange,
  onEdit,
  onDelete,
}: TemplatePageContentProps) {
  return (
    <div className="stack">
      {loading && showSkeleton ? <TaskDraftsListSkeleton /> : null}
      {!loading ? (
        <div className="stack task-list-content task-list-content--enter">
          {error ? (
            <div className="err" role="alert">
              <p>{error}</p>
              <div className="task-detail-error-actions">
                <button type="button" className="secondary" onClick={onRetry}>
                  Try again
                </button>
              </div>
            </div>
          ) : (
            <TemplateListBody
              templates={templates}
              debouncedQ={debouncedQ}
              selectedIds={selectedIds}
              instanceCounts={instanceCounts}
              batchDefaultCount={batchDefaultCount}
              allSelected={allSelected}
              deletingTemplateId={deletingTemplateId}
              exitingTemplateIds={exitingTemplateIds}
              loadTemplatePending={loadTemplatePending}
              deleteTemplatePending={deleteTemplatePending}
              renderNow={renderNow}
              onToggleSelectAll={onToggleSelectAll}
              onToggleSelected={onToggleSelected}
              onInstanceCountChange={onInstanceCountChange}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

export function TaskTemplatesPage() {
  const app = useTasksAppContext();
  useDocumentTitle("Task templates");
  const navigate = useNavigate();
  const model = useTaskTemplatesPageModel(app, navigate);

  return (
    <section className="panel task-list-section-panel task-detail-content--enter">
      <TemplateSearchToolbar
        searchInput={model.searchInput}
        onSearchChange={model.setSearchInput}
        onNewTemplate={() => app.openTemplateCreateModal()}
      />

      {model.batchError ? (
        <div className="err" role="alert">
          <p>{model.batchError}</p>
        </div>
      ) : null}

      <TemplatePageContent
        loading={model.loading}
        showSkeleton={model.showSkeleton}
        error={model.error}
        onRetry={() => void model.templatesQuery.refetch()}
        templates={model.templates}
        debouncedQ={model.debouncedQ}
        selectedIds={model.selectedIds}
        instanceCounts={model.instanceCounts}
        batchDefaultCount={model.batchDefaultCount}
        allSelected={model.allSelected}
        deletingTemplateId={model.deletingTemplateId}
        exitingTemplateIds={model.exitingTemplateIds}
        loadTemplatePending={app.loadTemplatePending}
        deleteTemplatePending={app.deleteTemplatePending}
        renderNow={model.renderNow}
        onToggleSelectAll={model.toggleSelectAll}
        onToggleSelected={model.toggleSelected}
        onInstanceCountChange={model.setInstanceCountForTemplate}
        onEdit={(id) => void app.editTemplateByID(id)}
        onDelete={(id) => void model.deleteTemplate(id)}
      />
      <TemplateBatchBar
        selectedCount={model.selectedCount}
        totalTaskCount={model.totalTaskCount}
        batchDefaultCount={model.batchDefaultCount}
        instantiatePending={app.instantiateTemplatesPending}
        onBatchDefaultCountChange={(count) =>
          model.setBatchDefaultCount(clampInstanceCount(count))
        }
        onApplyToAll={model.applyBatchDefaultToSelected}
        onCreate={() => void model.runBatchCreate()}
      />
    </section>
  );
}
