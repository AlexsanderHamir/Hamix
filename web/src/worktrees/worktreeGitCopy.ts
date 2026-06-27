export const worktreeGitCopy = {
  sectionTitle: "Worktrees",
  addWorktree: "Add worktree",
  registerRepository: "Register repository",
  registerWorktree: "Register worktree",
  createWorktree: "Create worktree",
  reconcile: "Reconcile",
  reconciling: "Reconciling…",
  deleteRepository: "Delete repository",
  deleteWorktree: "Delete worktree",
  repositoryActions: "Repository actions",
  worktreeActions: (name: string) => `Worktree actions for ${name}`,
  hostPathLabel: "Host path",
  listColumnName: "Name",
  listColumnBranch: "Branch",
  listColumnStatus: "Status",
  mainWorktreeShortLabel: "main",
  mainWorktreeLabel: "main worktree",
  mainWorktreeHint:
    "The worktree created by git clone or git init. git worktree remove cannot delete it while linked worktrees exist.",
  statusUnavailable: "—",
  statusUnavailableTitle: "Worktree checkout status is not available yet",
  detachedHead: "Detached HEAD",
  deleteMainWorktreeTitle:
    "git worktree remove cannot delete the main worktree while linked worktrees exist",
  emptyWorktreesTitle: "No worktrees yet",
  emptyWorktreesDescription:
    "Register an existing linked directory or create a new one with git worktree add.",
  registerModalTitle: "Register worktree",
  registerModalLead:
    "Link an existing git worktree directory and choose the branch Hamix should track.",
  registerModalPathLabel: "Worktree path",
  registerModalPathEmpty:
    "No unregistered linked worktrees found. Browse for a linked directory or create one with git worktree add.",
  registerModalBrowsePath: "Browse for worktree…",
  registerModalBrowseTitle: "Choose linked worktree",
  registerModalBrowseLead:
    "Select a directory that git worktree list shows as linked to this repository.",
  registerModalPathSelectedPrefix: "Selected:",
  registerModalProbeNotLinked: "This folder is not a linked worktree for this repository.",
  registerModalProbeAlreadyRegistered: "This worktree is already registered in Hamix.",
  registerModalDisplayNameLabel: "Display name",
  registerModalDisplayNamePlaceholder: "Optional",
  registerModalSubmit: "Register worktree",
  registerModalSubmitting: "Registering…",
  createModalTitle: "Create worktree",
  createModalLead:
    "Run git worktree add from the main checkout. Choose whether new branches start from main or from an existing linked worktree.",
  createModalStartFromLabel: "Start from",
  createModalStartFromMain: "Main repository checkout",
  createModalStartFromReference: "Reference worktree",
  createModalReferenceLabel: "Reference worktree",
  createModalReferenceDetached:
    "The selected worktree has a detached HEAD. Pick a worktree checked out on a branch.",
  createModalPathLabel: "Worktree path",
  createModalChoosePath: "Choose worktree path",
  createModalPathSelectedPrefix: "Path:",
  createModalDisplayNameLabel: "Display name",
  createModalDisplayNamePlaceholder: "Optional",
  createModalSubmit: "Create worktree",
  createModalSubmitting: "Creating…",
  cancel: "Cancel",
} as const;

export function worktreeAriaLabel(displayName: string): string {
  return `Worktree: ${displayName}`;
}

export function deleteWorktreeAriaLabel(displayName: string): string {
  return `Delete worktree "${displayName}"`;
}

export function cannotDeleteMainWorktreeAriaLabel(displayName: string): string {
  return `Cannot delete main worktree "${displayName}"`;
}

export function liveWorktreeOptionLabel(path: string, isMain: boolean): string {
  return isMain ? `${path} (main worktree)` : path;
}
