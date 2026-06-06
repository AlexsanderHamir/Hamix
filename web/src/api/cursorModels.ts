export type CursorModelOption = { id: string; label: string };

/**
 * Cursor CLI lists `auto` as a model id, but an empty `cursor_model` in
 * app settings already means "omit `--model` and let the runner pick" —
 * the same behaviour as explicitly passing `--model auto`. Surfacing
 * both in a `<select>` duplicates one choice under two labels.
 */
const AUTO_MODEL_IDS = new Set(["auto"]);

export function isCursorAutoModelId(id: string): boolean {
  return AUTO_MODEL_IDS.has(id.trim().toLowerCase());
}

/** Map stored `auto` to the empty select value used for "runner picks". */
export function normalizeCursorModelSelectValue(value: string): string {
  return isCursorAutoModelId(value) ? "" : value.trim();
}

/** Drop auto-routing entries from CLI model lists — empty value covers them. */
export function filterCursorModelsForSelect(
  models: CursorModelOption[] | undefined,
): CursorModelOption[] {
  if (!models) return [];
  return models.filter((m) => !isCursorAutoModelId(m.id));
}
