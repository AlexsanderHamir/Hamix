/** Last path segment for list/detail titles; falls back to the full path. */
export function repositoryDisplayName(path: string): string {
  const normalized = path.trim().replace(/\\/g, "/").replace(/\/$/, "");
  if (!normalized) return path;
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}
