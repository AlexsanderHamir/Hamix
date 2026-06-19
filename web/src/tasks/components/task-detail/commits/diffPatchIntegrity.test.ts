import { describe, expect, it } from "vitest";
import { isPatchLikelyIncomplete } from "./diffPatchIntegrity";

describe("diffPatchIntegrity", () => {
  it("flags patches ending on a hunk header", () => {
    expect(isPatchLikelyIncomplete("@@ -1,1 +1,1 @@")).toBe(true);
  });

  it("accepts complete change lines", () => {
    expect(isPatchLikelyIncomplete("+hello\n-world")).toBe(false);
  });
});
