import { describe, expect, it } from "vite-plus/test";

import { getModelPickerVariant } from "./modelPickerVariants";

describe("getModelPickerVariant", () => {
  it("groups the GPT and Claude families with their row order", () => {
    expect(getModelPickerVariant("gpt-6-astra", "codex")).toMatchObject({
      family: "GPT 6",
      variant: "Astra",
      label: "GPT-6 Astra",
      priority: 0,
    });
    expect(getModelPickerVariant("gpt-6-luna", "codex")).toMatchObject({
      family: "GPT 6",
      variant: "Luna",
      label: "GPT-6 Luna",
      priority: 3,
    });
    expect(getModelPickerVariant("claude-fable-5-1", "claudeAgent")).toMatchObject({
      family: "Claude",
      variant: "Fable",
      label: "Fable 5.1",
      priority: 0,
    });
  });

  it("ignores slugs claimed by another driver", () => {
    expect(getModelPickerVariant("gpt-6-astra", "claudeAgent")).toBeNull();
    expect(getModelPickerVariant("claude-opus-5-5", "codex")).toBeNull();
  });

  it("ignores custom, legacy and unknown models", () => {
    expect(getModelPickerVariant("claude-opus-5-5", "claudeAgent", true)).toBeNull();
    expect(getModelPickerVariant("claude-fable-5", "claudeAgent")).toBeNull();
    expect(getModelPickerVariant("claude-opus-5", "claudeAgent")).toBeNull();
    expect(getModelPickerVariant("gpt-5.6-sol", "codex")).toBeNull();
    expect(getModelPickerVariant("gpt-5.5", "codex")).toBeNull();
  });
});
