export class SubtaskDependsOnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubtaskDependsOnError";
  }
}

export type MaterializeSubtaskDependsOnInput = {
  waitForParent: boolean;
  parentId: string;
  /** Draft-local indices into the pending subtask list (create flow). */
  siblingIndices?: number[];
  /** Explicit sibling task ids (detail flow). Mutually exclusive with siblingIndices resolution. */
  siblingIds?: string[];
  siblingIdsByIndex?: ReadonlyMap<number, string>;
  /** When resolving indices, skip this draft index (the subtask being configured). */
  selfIndex?: number;
};

/**
 * Builds the `depends_on` list for a subtask from UI opt-in flags.
 * Throws {@link SubtaskDependsOnError} when indices are invalid.
 */
export function materializeSubtaskDependsOn(
  input: MaterializeSubtaskDependsOnInput,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push(trimmed);
  };

  if (input.waitForParent) {
    const parentId = input.parentId.trim();
    if (!parentId) {
      throw new SubtaskDependsOnError("wait for parent requires a parent task id");
    }
    push(parentId);
  }

  if (input.siblingIds !== undefined) {
    for (const id of input.siblingIds) {
      push(id);
    }
    return out;
  }

  const indices = input.siblingIndices ?? [];
  if (indices.length === 0) {
    return out;
  }

  const map = input.siblingIdsByIndex;
  if (!map) {
    throw new SubtaskDependsOnError("sibling index resolution requires siblingIdsByIndex");
  }

  for (const raw of indices) {
    if (!Number.isInteger(raw)) {
      throw new SubtaskDependsOnError(`invalid sibling index: ${String(raw)}`);
    }
    if (input.selfIndex !== undefined && raw === input.selfIndex) {
      throw new SubtaskDependsOnError("subtask cannot depend on itself");
    }
    const resolved = map.get(raw);
    if (!resolved?.trim()) {
      throw new SubtaskDependsOnError(`unknown sibling index: ${raw}`);
    }
    push(resolved);
  }

  return out;
}

/** Re-map draft-local sibling indices after a pending subtask row is removed. */
export function remapPendingSubtaskSiblingIndices(
  indices: number[],
  removedIndex: number,
): number[] {
  const out: number[] = [];
  for (const idx of indices) {
    if (idx === removedIndex) continue;
    if (idx < removedIndex) out.push(idx);
    else if (idx > removedIndex) out.push(idx - 1);
  }
  return out;
}

export function emptyPendingSubtaskDraftScheduling(): {
  depends_on_sibling_indices: number[];
} {
  return { depends_on_sibling_indices: [] };
}
