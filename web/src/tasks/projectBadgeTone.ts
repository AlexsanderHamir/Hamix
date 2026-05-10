const TONE_COUNT = 8;

/**
 * Stable 0..7 from a project id so the task list badge can pick a preset hue.
 * Same id always maps to the same tone (FNV-1a over the string).
 */
export function projectBadgeToneFromId(id: string): number {
  const s = id.trim();
  if (!s) return 0;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % TONE_COUNT;
}
