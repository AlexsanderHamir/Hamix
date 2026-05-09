import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { createProject, deleteProject } from "@/api";
import { EmptyState } from "@/shared/EmptyState";
import { useDocumentTitle } from "@/shared/useDocumentTitle";
import { DEFAULT_PROJECT_ID, type Project } from "@/types";
import { ProjectDeleteConfirmDialog } from "./ProjectDeleteConfirmDialog";
import { useProjects } from "./hooks";
import { projectQueryKeys } from "./queryKeys";

export function ProjectListPage() {
  useDocumentTitle("Projects");
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useProjects({ includeArchived: true });
  const projects = data?.projects ?? [];
  const activeCount = projects.filter((p) => p.status === "active").length;
  const archivedCount = projects.length - activeCount;
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      setName("");
      await queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async (_void, deletedId: string) => {
      setDeleteTarget((prev) => (prev?.id === deletedId ? null : prev));
      await queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
    },
  });

  function submitProject(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    createMutation.mutate({ name: trimmedName });
  }

  function requestDelete(project: Project) {
    if (project.id === DEFAULT_PROJECT_ID) return;
    setDeleteTarget(project);
  }

  function confirmDelete() {
    if (!deleteTarget || deleteTarget.id === DEFAULT_PROJECT_ID) return;
    deleteMutation.mutate(deleteTarget.id);
  }

  return (
    <section className="panel task-detail-panel pl">
      <header className="pl__head">
        <div className="pl__head-text">
          <h2 className="term-arrow">
            <span>Projects</span>
          </h2>
          <p className="pl__lede term-prompt muted" aria-hidden="true">
            <span>organize --context --memory</span>
          </p>
          <p className="pl__subtitle">
            Group tasks around a shared context space so the agent can borrow
            the right project memory at run time.
          </p>
        </div>
        <dl className="pl__stats" aria-label="Project summary">
          <div className="pl__stat">
            <dd>{projects.length}</dd>
            <dt>total</dt>
          </div>
          <span className="pl__stat-sep" aria-hidden="true" />
          <div className="pl__stat pl__stat--active">
            <dd>{activeCount}</dd>
            <dt>active</dt>
          </div>
          <span className="pl__stat-sep" aria-hidden="true" />
          <div className="pl__stat">
            <dd>{archivedCount}</dd>
            <dt>archived</dt>
          </div>
        </dl>
      </header>

      <div className="pl__create-area">
        <div className="pl__create-copy">
          <p className="pl__create-label">Create project</p>
          <p className="pl__create-help">
            Start a context space for a repo, product area, or recurring
            workflow.
          </p>
        </div>
        <form className="pl__create" onSubmit={submitProject} aria-label="Create project">
          <input
            id="project-create-name"
            className="pl__create-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Billing platform"
            required
            aria-label="Project name"
          />
          <button
            type="submit"
            className="pl__create-btn"
            disabled={createMutation.isPending || !name.trim()}
          >
            {createMutation.isPending ? "Creating..." : "Create"}
          </button>
        </form>
      </div>
      {createMutation.error ? (
        <div className="pd__inline-error" role="alert">
          {createMutation.error.message}
        </div>
      ) : null}

      <div className="pl__list-section">
        {isLoading ? <ProjectListSkeleton /> : null}
        {error ? (
          <div className="pd__inline-error" role="alert">
            {error.message}
          </div>
        ) : null}
        {!isLoading && !error && projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create your first project to start organizing shared context."
            density="compact"
            hideIcon
          />
        ) : null}
        {projects.length > 0 ? (
          <div className="pl__list" aria-label="Projects">
            {projects.map((project, i) => (
              <ProjectRow
                key={project.id}
                project={project}
                index={i}
                onRequestDelete={requestDelete}
                deletePending={
                  deleteMutation.isPending && deleteTarget?.id === project.id
                }
              />
            ))}
          </div>
        ) : null}
      </div>

      {deleteTarget ? (
        <ProjectDeleteConfirmDialog
          projectName={deleteTarget.name}
          deletePending={deleteMutation.isPending}
          error={deleteMutation.error?.message ?? null}
          onCancel={() => {
            if (!deleteMutation.isPending) {
              deleteMutation.reset();
              setDeleteTarget(null);
            }
          }}
          onConfirm={confirmDelete}
        />
      ) : null}
    </section>
  );
}

function ProjectRow({
  project,
  index,
  onRequestDelete,
  deletePending,
}: {
  project: Project;
  index: number;
  onRequestDelete: (project: Project) => void;
  deletePending: boolean;
}) {
  const isArchived = project.status === "archived";
  const isDefaultProject = project.id === DEFAULT_PROJECT_ID;
  const openLabel = `Open project ${project.name}`;
  const to = `/projects/${encodeURIComponent(project.id)}`;

  return (
    <div
      className={isArchived ? "pl__row pl__row--archived" : "pl__row"}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <Link className="pl__row-left" to={to} aria-label={openLabel}>
        <div className="pl__row-marker" aria-hidden="true" />
        <div className="pl__row-main">
          <span className="pl__row-name">{project.name}</span>
          <span className="pl__row-desc">
            {project.description ||
              project.context_summary ||
              "No description"}
          </span>
        </div>
      </Link>
      <div className="pl__row-meta-cluster">
        {isDefaultProject ? null : (
          <button
            type="button"
            className="pl__row-delete"
            aria-label={`Delete project ${project.name}`}
            disabled={deletePending}
            onClick={() => onRequestDelete(project)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <div className="pl__row-meta">
          <span
            className={
              isArchived
                ? "pd__badge pd__badge--muted"
                : "pd__badge pd__badge--live"
            }
          >
            <span className="pd__badge-dot" aria-hidden="true" />
            {project.status}
          </span>
          <span className="pl__row-date">{formatDate(project.updated_at)}</span>
        </div>
      </div>
      <Link
        className="pl__row-arrow-link"
        to={to}
        tabIndex={-1}
        aria-label={`${project.name} — open details`}
      >
        <svg className="pl__row-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  );
}

function ProjectListSkeleton() {
  return (
    <div className="pl__list" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div className="pl__row pl__row--skeleton" key={i}>
          <div className="pl__row-left" aria-hidden="true">
            <div className="pl__row-marker" />
            <div className="pl__row-main">
              <span className="pd__shimmer" style={{ width: `${60 - i * 8}%`, height: "0.9rem" }} />
              <span className="pd__shimmer" style={{ width: `${40 + i * 5}%`, height: "0.75rem" }} />
            </div>
          </div>
          <div className="pl__row-meta-cluster" aria-hidden="true">
            <div className="pl__row-meta">
              <span className="pd__shimmer" style={{ width: "3rem", height: "0.75rem" }} />
            </div>
          </div>
          <div className="pl__row-arrow-link" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
