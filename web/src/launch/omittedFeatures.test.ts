import { describe, expect, it } from "vitest";
import { isUiFeatureOmitted, OMITTED_UI_FEATURES } from "./omittedFeatures";

describe("omittedFeatures", () => {
  it("documents projects as omitted for the current launch", () => {
    expect(OMITTED_UI_FEATURES.projects).toBe(true);
    expect(isUiFeatureOmitted("projects")).toBe(true);
  });
});
