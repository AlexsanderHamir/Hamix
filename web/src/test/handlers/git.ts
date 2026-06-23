import { DEFAULT_PROJECT_ID } from "@/types";

export const GIT_TEST_REPO_ID = "00000000-0000-4000-8000-000000000010";
export const GIT_TEST_WORKTREE_ID = "00000000-0000-4000-8000-000000000020";
export const GIT_TEST_BRANCH_ID = "00000000-0000-4000-8000-000000000030";

export function gitRepositoriesResponse(): unknown {
  return {
    repositories: [
      {
        id: GIT_TEST_REPO_ID,
        project_id: DEFAULT_PROJECT_ID,
        path: "/repo/main",
        host_path: "",
        default_branch: "main",
        created_at: "2026-06-22T12:00:00Z",
        updated_at: "2026-06-22T12:00:00Z",
      },
    ],
  };
}

export function gitWorktreesResponse(): unknown {
  return {
    worktrees: [
      {
        id: GIT_TEST_WORKTREE_ID,
        repository_id: GIT_TEST_REPO_ID,
        path: "/repo/main",
        name: "main",
        is_main: true,
        created_at: "2026-06-22T12:00:00Z",
      },
    ],
  };
}

export function gitBranchesResponse(): unknown {
  return {
    branches: [
      {
        id: GIT_TEST_BRANCH_ID,
        repository_id: GIT_TEST_REPO_ID,
        name: "main",
        head_sha: "abc123",
        created_at: "2026-06-22T12:00:00Z",
      },
    ],
  };
}

/** Responds to project-scoped git REST paths used by the Worktrees UI and task create modal. */
export function respondGitApi(url: string, method = "GET"): Response | null {
  const base = `/projects/${DEFAULT_PROJECT_ID}/git`;
  if (method !== "GET") return null;
  if (url.endsWith(`${base}/repositories`)) {
    return Response.json(gitRepositoriesResponse());
  }
  if (url.includes(`${base}/repositories/`) && url.endsWith("/worktrees")) {
    return Response.json(gitWorktreesResponse());
  }
  if (url.includes(`${base}/repositories/`) && url.endsWith("/branches")) {
    return Response.json(gitBranchesResponse());
  }
  return null;
}
