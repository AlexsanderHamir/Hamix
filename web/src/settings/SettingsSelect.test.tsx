import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  SettingsSelect,
  groupModelSelectRows,
} from "./SettingsSelect";

const OPTIONS = [
  { value: "", label: "Auto" },
  { value: "opus-4", label: "Opus 4" },
  { value: "sonnet-4.5", label: "Sonnet 4.5" },
];

describe("SettingsSelect", () => {
  it("opens a portal listbox and commits a choice", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SettingsSelect
        testId="settings-test-select"
        value=""
        onChange={onChange}
        options={OPTIONS}
        searchable={false}
      />,
    );

    await user.click(screen.getByTestId("settings-test-select"));
    const listbox = await screen.findByRole("listbox");
    expect(listbox).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "Opus 4" }));
    expect(onChange).toHaveBeenCalledWith("opus-4");
  });

  it("filters options in the portal search field when searchable", async () => {
    const user = userEvent.setup();

    render(
      <SettingsSelect
        testId="settings-test-select"
        value=""
        onChange={vi.fn()}
        options={OPTIONS}
        searchable
        searchPlaceholder="Search models…"
      />,
    );

    await user.click(screen.getByTestId("settings-test-select"));
    const search = await screen.findByPlaceholderText("Search models…");
    await user.type(search, "sonnet");

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Sonnet 4.5" })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "Opus 4" })).not.toBeInTheDocument();
    });
  });

  it("keeps the selected label on the trigger while open", async () => {
    const user = userEvent.setup();

    render(
      <SettingsSelect
        testId="settings-test-select"
        value="opus-4"
        onChange={vi.fn()}
        options={OPTIONS}
        searchable={false}
      />,
    );

    expect(screen.getByTestId("settings-test-select")).toHaveTextContent("Opus 4");
    await user.click(screen.getByTestId("settings-test-select"));
    expect(screen.getByTestId("settings-test-select")).toHaveTextContent("Opus 4");
  });
});

describe("groupModelSelectRows", () => {
  it("inserts family headers between model groups", () => {
    const rows = groupModelSelectRows([
      { value: "", label: "Auto" },
      { value: "c53-low", label: "Codex 5.3 Low" },
      { value: "c53", label: "Codex 5.3" },
      { value: "gpt", label: "GPT-5.2" },
    ]);
    expect(rows).toEqual([
      { type: "option", value: "", label: "Auto" },
      { type: "header", label: "Codex 5.3" },
      { type: "option", value: "c53-low", label: "Codex 5.3 Low" },
      { type: "option", value: "c53", label: "Codex 5.3" },
      { type: "header", label: "GPT-5.2" },
      { type: "option", value: "gpt", label: "GPT-5.2" },
    ]);
  });
});
