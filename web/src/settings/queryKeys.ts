export const settingsQueryKeys = {
  workspaceRoots: () => ["settings", "workspace-roots"] as const,
  browseDirs: (path: string) => ["settings", "browse-dirs", path] as const,
  gitProbe: (path: string) => ["settings", "git-probe", path] as const,
};
