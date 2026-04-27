import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listTasks } from "@/api";

type Props = {
  projectId: string;
};

export function ProjectTasksPanel({ projectId }: Props) {
  const projectTasks = useQuery({
    queryKey: ["tasks", "project-members", projectId],
    queryFn: ({ signal }) => listTasks(200, 0, { signal }),
    enabled: Boolean(projectId),
  });
  const memberTasks = (projectTasks.data?.tasks ?? []).filter(
    (task) => task.project_id === projectId,
  );

  return (
    <section className="pd__card" aria-labelledby="pd-tasks-title">
      <div className="pd__card-head">
        <div className="pd__icon pd__icon--green" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6.75 9l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="2.25" y="2.25" width="13.5" height="13.5" rx="3" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
          </svg>
        </div>
        <div>
          <h2 id="pd-tasks-title" className="pd__card-title">
            Linked tasks
          </h2>
          <p className="pd__card-desc">Recent work in this project</p>
        </div>
      </div>

      {projectTasks.isLoading ? <TaskListSkeleton /> : null}

      {!projectTasks.isLoading && memberTasks.length === 0 ? (
        <div className="pd__empty">
          <p>No tasks linked to this project yet</p>
        </div>
      ) : null}

      {memberTasks.length > 0 ? (
        <ul className="pd__task-list">
          {memberTasks.slice(0, 8).map((task) => (
            <li key={task.id}>
              <Link
                to={`/tasks/${encodeURIComponent(task.id)}`}
                className="pd__task-row"
              >
                <span className="pd__task-title">{task.title}</span>
                <span className="pd__task-chip">{task.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function TaskListSkeleton() {
  return (
    <div className="pd__task-skeleton" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="pd__task-skeleton-row">
          <span className="pd__shimmer" style={{ width: `${58 - i * 12}%`, height: "0.875rem" }} />
          <span className="pd__shimmer" style={{ width: "3.5rem", height: "0.75rem" }} />
        </div>
      ))}
    </div>
  );
}
