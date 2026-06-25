import { describe, expect, it } from "vitest";
import {
  parseBrowseDirsResponse,
  parseWorkspaceRootsResponse,
} from "./settingsBrowse";

describe("parseWorkspaceRootsResponse", () => {
  it("parses roots and environment", () => {
    expect(
      parseWorkspaceRootsResponse({
        environment: "native",
        roots: [
          {
            id: "home",
            path: "/home/me",
            label: "Home",
            available: true,
          },
        ],
      }),
    ).toEqual({
      environment: "native",
      roots: [
        {
          id: "home",
          path: "/home/me",
          label: "Home",
          available: true,
          unavailable_reason: undefined,
        },
      ],
    });
  });
});

describe("parseBrowseDirsResponse", () => {
  it("parses directory entries", () => {
    expect(
      parseBrowseDirsResponse({
        path: "/home/me",
        is_git_repo: true,
        entries: [
          {
            name: "my-app",
            path: "/home/me/my-app",
            has_children: true,
            is_git_repo: true,
          },
        ],
      }),
    ).toEqual({
      path: "/home/me",
      parent_path: undefined,
      is_git_repo: true,
      entries: [
        {
          name: "my-app",
          path: "/home/me/my-app",
          has_children: true,
          is_git_repo: true,
        },
      ],
    });
  });
});
