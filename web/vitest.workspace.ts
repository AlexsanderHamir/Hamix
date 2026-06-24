import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineWorkspace } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Full-page and App-level tests — run in the integration CI cell. */
const integrationIncludes = [
  "src/app/**/*.test.tsx",
  "src/**/pages/**/*.test.tsx",
  "src/tasks/create/**/*.test.tsx",
  "src/settings/SettingsPage.test.tsx",
  "src/projects/ProjectListPage.test.tsx",
  "src/projects/ProjectDetailPage.test.tsx",
  "src/worktrees/WorktreesPage.test.tsx",
];

const sharedTest = {
  environment: "jsdom" as const,
  setupFiles: ["./src/test/setup.ts"],
  restoreMocks: true,
  unstubGlobals: true,
};

const sharedVite = {
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
};

export default defineWorkspace([
  {
    ...sharedVite,
    test: {
      ...sharedTest,
      name: "unit",
      include: ["src/**/*.test.ts"],
    },
  },
  {
    ...sharedVite,
    test: {
      ...sharedTest,
      name: "components",
      include: ["src/**/*.test.tsx"],
      exclude: integrationIncludes,
    },
  },
  {
    ...sharedVite,
    test: {
      ...sharedTest,
      name: "integration",
      include: integrationIncludes,
      testTimeout: 15_000,
    },
  },
]);
