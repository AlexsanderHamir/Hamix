/** Detects whether a server-truncated patch likely ends mid-hunk. */
export function isPatchLikelyIncomplete(patch: string): boolean {
  const trimmed = patch.trimEnd();
  if (trimmed === "") {
    return false;
  }
  const lines = trimmed.split("\n");
  const last = lines[lines.length - 1] ?? "";
  if (last.startsWith("@@")) {
    return true;
  }
  if (last.startsWith("\\")) {
    return false;
  }
  if (last.startsWith("diff --git")) {
    return true;
  }
  if (!/^[ +-]/.test(last)) {
    return true;
  }
  return false;
}
