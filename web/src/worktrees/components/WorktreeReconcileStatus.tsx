import { worktreeGitCopy } from "../worktreeGitCopy";

type Props = {
  className?: string;
};

export function WorktreeReconcileStatus({ className }: Props) {
  return (
    <div
      className={["worktrees-reconcile-status", className].filter(Boolean).join(" ")}
      role="status"
      aria-live="polite"
    >
      <span className="worktrees-reconcile-status__spinner" aria-hidden />
      <span>{worktreeGitCopy.reconcilingStatus}</span>
    </div>
  );
}
