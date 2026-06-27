/** Normalize paths for matching registered rows to live inventory rows. */
export function worktreePathsMatch(a: string, b: string): boolean {
  const norm = (p: string) => p.trim().replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  return norm(a) === norm(b);
}
