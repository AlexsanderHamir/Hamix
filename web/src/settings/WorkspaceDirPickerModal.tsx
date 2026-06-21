import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/Modal";
import {
  browseWorkspaceDirs,
  fetchWorkspaceRoots,
  type BrowseDirEntry,
  type WorkspaceBrowseRoot,
} from "@/api/settingsBrowse";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  currentPath: string;
};

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; roots: WorkspaceBrowseRoot[]; environment: "native" | "docker" }
  | { kind: "error"; message: string };

export function WorkspaceDirPickerModal({
  open,
  onClose,
  onSelect,
  currentPath,
}: Props) {
  const [loadState, setLoadState] = useState<LoadState>({ kind: "idle" });
  const [entries, setEntries] = useState<BrowseDirEntry[]>([]);
  const [currentBrowsePath, setCurrentBrowsePath] = useState("");
  const [parentPath, setParentPath] = useState("");
  const [listingError, setListingError] = useState<string | null>(null);
  const [listingPending, setListingPending] = useState(false);

  const loadListing = useCallback(async (path: string) => {
    setListingPending(true);
    setListingError(null);
    try {
      const listing = await browseWorkspaceDirs(path);
      setEntries(listing.entries);
      setCurrentBrowsePath(listing.path ?? path);
      setParentPath(listing.parent_path ?? "");
    } catch (err) {
      setListingError(err instanceof Error ? err.message : "Could not list folders");
      setEntries([]);
    } finally {
      setListingPending(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setLoadState({ kind: "loading" });
    void fetchWorkspaceRoots()
      .then((roots) => {
        if (cancelled) return;
        setLoadState({
          kind: "ready",
          roots: roots.roots,
          environment: roots.environment,
        });
        return loadListing("");
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadState({
          kind: "error",
          message: err instanceof Error ? err.message : "Could not load browse roots",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [open, loadListing]);

  const breadcrumbLabel = useMemo(() => {
    if (currentBrowsePath.trim() === "") {
      return "Browse roots";
    }
    return currentBrowsePath;
  }, [currentBrowsePath]);

  const selectedInView =
    currentBrowsePath.trim() !== "" &&
    (currentPath.trim() === currentBrowsePath.trim() ||
      currentPath.trim().startsWith(currentBrowsePath.trim()));

  function openEntry(entry: BrowseDirEntry) {
    if (!entry.has_children) {
      setCurrentBrowsePath(entry.path);
      setParentPath(entry.path);
      setEntries([]);
      return;
    }
    void loadListing(entry.path);
  }

  function goUp() {
    if (currentBrowsePath.trim() === "") {
      return;
    }
    if (parentPath.trim() === "") {
      void loadListing("");
      return;
    }
    void loadListing(parentPath);
  }

  function selectFolder(path: string) {
    onSelect(path);
    onClose();
  }

  if (!open) {
    return null;
  }

  return (
    <Modal
      labelledBy="workspace-dir-picker-title"
      describedBy="workspace-dir-picker-lead"
      size="wide"
      onClose={onClose}
    >
      <header className="workspace-picker-header">
        <h3 id="workspace-dir-picker-title" className="workspace-picker-title">
          Choose project folder
        </h3>
        <p id="workspace-dir-picker-lead" className="workspace-picker-lead">
          Agents run in this directory. Pick the repository they should edit.
        </p>
      </header>

      {loadState.kind === "loading" ? (
        <p className="workspace-picker-status">Loading folders…</p>
      ) : null}

      {loadState.kind === "error" ? (
        <p className="workspace-picker-status workspace-picker-status--error" role="alert">
          {loadState.message}
        </p>
      ) : null}

      {loadState.kind === "ready" && loadState.environment === "docker" ? (
        <p className="workspace-picker-hint">
          Showing folders available inside this dev container (your home directory is mounted at{" "}
          <code>/host-home</code>).
        </p>
      ) : null}

      {loadState.kind === "ready" ? (
        <>
          <div className="workspace-picker-toolbar">
            <button
              type="button"
              className="btn-secondary workspace-picker-up"
              onClick={goUp}
              disabled={listingPending || currentBrowsePath.trim() === ""}
            >
              Up
            </button>
            <p className="workspace-picker-breadcrumb" title={breadcrumbLabel}>
              {breadcrumbLabel}
            </p>
          </div>

          {listingError ? (
            <p className="workspace-picker-status workspace-picker-status--error" role="alert">
              {listingError}
            </p>
          ) : null}

          <ul className="workspace-picker-list" aria-busy={listingPending}>
            {entries.map((entry) => (
              <li key={entry.path}>
                <button
                  type="button"
                  className="workspace-picker-row"
                  onClick={() => openEntry(entry)}
                  disabled={listingPending}
                >
                  <span className="workspace-picker-row-name">{entry.name}</span>
                  {entry.is_git_repo ? (
                    <span className="workspace-picker-badge">Git repo</span>
                  ) : null}
                </button>
              </li>
            ))}
            {!listingPending && entries.length === 0 ? (
              <li className="workspace-picker-empty">No folders here.</li>
            ) : null}
          </ul>

          <footer className="workspace-picker-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={currentBrowsePath.trim() === "" || listingPending}
              onClick={() => selectFolder(currentBrowsePath)}
            >
              Use this folder
            </button>
          </footer>

          {selectedInView && currentBrowsePath.trim() !== "" ? (
            <p className="workspace-picker-footnote">
              Selected path is saved when you click Save on Settings.
            </p>
          ) : null}
        </>
      ) : null}
    </Modal>
  );
}
