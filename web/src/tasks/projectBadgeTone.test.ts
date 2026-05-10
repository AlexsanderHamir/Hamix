import { describe, expect, it } from "vitest";
import { projectBadgeToneFromId } from "./projectBadgeTone";

describe("projectBadgeToneFromId", () => {
  it("returns 0..7", () => {
    for (let i = 0; i < 50; i++) {
      const t = projectBadgeToneFromId(`project-${i}`);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(7);
    }
  });

  it("is stable for the same id", () => {
    const id = "auth-v2-migration";
    expect(projectBadgeToneFromId(id)).toBe(projectBadgeToneFromId(id));
  });

  it("treats whitespace-only as 0", () => {
    expect(projectBadgeToneFromId("   ")).toBe(0);
  });
});
