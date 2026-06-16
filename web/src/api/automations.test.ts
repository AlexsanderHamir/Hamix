import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAutomation,
  listAutomations,
  parseAutomation,
  parseAutomationListResponse,
  parseAutomationSelection,
} from "./automations";

const automationWire = {
  id: "22222222-2222-4222-8222-222222222222",
  title: "Run tests",
  description: "Execute the project test suite before finishing.",
  created_at: "2026-06-15T00:00:00Z",
  updated_at: "2026-06-15T00:00:00Z",
};

describe("automation API parsers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses automation rows", () => {
    expect(parseAutomation(automationWire).title).toBe("Run tests");
  });

  it("parses automation selections", () => {
    expect(
      parseAutomationSelection({
        automation_id: automationWire.id,
        state: "yes",
      }),
    ).toEqual({
      automation_id: automationWire.id,
      state: "yes",
    });
  });

  it("rejects unknown automation states", () => {
    expect(() =>
      parseAutomationSelection({
        automation_id: automationWire.id,
        state: "maybe",
      }),
    ).toThrow(/automation state/);
  });

  it("lists automations", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ automations: [automationWire], limit: 100 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const out = await listAutomations({ limit: 100 });

    expect(out.automations).toHaveLength(1);
    expect(String(spy.mock.calls[0][0])).toContain("/automations");
  });

  it("parses list envelopes", () => {
    const out = parseAutomationListResponse({
      automations: [automationWire],
      limit: 50,
    });
    expect(out.limit).toBe(50);
    expect(out.automations[0]?.id).toBe(automationWire.id);
  });

  it("creates automations", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(automationWire), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const out = await createAutomation({
      title: "Run tests",
      description: "Execute the project test suite before finishing.",
    });
    expect(out.title).toBe("Run tests");
  });
});
