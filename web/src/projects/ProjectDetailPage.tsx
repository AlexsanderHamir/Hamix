import { Link, useParams } from "react-router-dom";
import { EmptyState } from "@/shared/EmptyState";
import { useDocumentTitle } from "@/shared/useDocumentTitle";
import { useProject } from "./hooks";
import { ProjectSettingsPanel } from "./ProjectSettingsPanel";
import { ProjectTasksPanel } from "./ProjectTasksPanel";

export function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const project = useProject(projectId);
  const title = project.data?.name ? `${project.data.name} project` : "Project";
  useDocumentTitle(title);

  if (!projectId) {
    return (
      <section className="panel task-detail-panel">
        <EmptyState
          title="Missing project id"
          description="Choose a project from the project list."
          density="compact"
          hideIcon
        />
      </section>
    );
  }

  return (
    <section className="panel task-detail-panel pd">
      <header className="pd__header">
        <Link to="/projects" className="pd__back project-context-back-link">
          <span aria-hidden="true">&#8249;</span>
          All projects
        </Link>
        {project.data ? (
          <div className="pd__header-title" aria-label="Current project">
            <h1>{project.data.name}</h1>
            <span
              className={
                project.data.status === "archived"
                  ? "pd__badge pd__badge--muted"
                  : "pd__badge pd__badge--live"
              }
            >
              <span className="pd__badge-dot" aria-hidden="true" />
              {project.data.status}
            </span>
          </div>
        ) : null}
      </header>

      {project.data?.description ? (
        <p className="pd__subtitle">{project.data.description}</p>
      ) : null}

      {project.isLoading ? <ProjectDetailSkeleton /> : null}

      {project.error ? (
        <div className="pd__error" role="alert">
          <div className="pd__error-dot" aria-hidden="true" />
          <div>
            <p className="pd__error-title">Unable to load this project</p>
            <p className="pd__error-message">{project.error.message}</p>
          </div>
        </div>
      ) : null}

      {project.data ? (
        <div className="pd__grid">
          <ProjectSettingsPanel project={project.data} />

          <Link
            to={`/projects/${encodeURIComponent(projectId)}/context`}
            className="pd__context-card"
            aria-labelledby="pd-context-title"
          >
            <div className="pd__context-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="5" r="2" fill="currentColor" opacity="0.9" />
                <circle cx="5" cy="14" r="2" fill="currentColor" opacity="0.55" />
                <circle cx="15" cy="14" r="2" fill="currentColor" opacity="0.55" />
                <path d="M10 7v3M8.5 12l-2 1M11.5 12l2 1" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
              </svg>
            </div>
            <div className="pd__context-body">
              <h2 id="pd-context-title" className="pd__context-title">
                Project context
              </h2>
              <p className="pd__context-desc">
                Memory nodes, decisions, and constraints
              </p>
            </div>
            <svg className="pd__context-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          <ProjectTasksPanel projectId={projectId} />
        </div>
      ) : null}
    </section>
  );
}

function ProjectDetailSkeleton() {
  return (
    <div className="pd__skeleton" aria-hidden="true">
      <div className="pd__shimmer pd__shimmer--card" />
      <div className="pd__shimmer pd__shimmer--card pd__shimmer--card-sm" />
      <div className="pd__shimmer pd__shimmer--card pd__shimmer--card-sm" />
    </div>
  );
}
