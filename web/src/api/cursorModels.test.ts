import { describe, expect, it } from "vitest";
import {
  filterCursorModelsForSelect,
  isCursorAutoModelId,
  normalizeCursorModelSelectValue,
} from "./cursorModels";

describe("cursorModels", () => {
  it("treats auto id as the empty select value", () => {
    expect(isCursorAutoModelId("auto")).toBe(true);
    expect(isCursorAutoModelId("Auto")).toBe(true);
    expect(normalizeCursorModelSelectValue("auto")).toBe("");
    expect(normalizeCursorModelSelectValue("opus-4")).toBe("opus-4");
  });

  it("filters auto from model lists shown in selects", () => {
    const models = [
      { id: "auto", label: "Auto (Current)" },
      { id: "gpt-5.2", label: "GPT-5.2" },
    ];
    expect(filterCursorModelsForSelect(models)).toEqual([
      { id: "gpt-5.2", label: "GPT-5.2" },
    ]);
  });
});
