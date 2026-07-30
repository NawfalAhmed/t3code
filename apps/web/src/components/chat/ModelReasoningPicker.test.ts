import { ProviderInstanceId, type ProviderOptionDescriptor } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import type { ModelReasoningGridSpec } from "./ModelReasoningGrid";
import { buildModelReasoningTriggerDisplay } from "./ModelReasoningPicker";

const spec: ModelReasoningGridSpec = {
  columns: [
    { id: "low", label: "Low" },
    { id: "medium", label: "Medium" },
    { id: "high", label: "High" },
    { id: "xhigh", label: "XHigh" },
  ],
  rows: [
    {
      model: "gpt-6.1-sol",
      label: "GPT-6.1 Sol",
      variant: "Sol",
      reasoningOptions: [],
    },
  ],
};

function descriptors(serviceTier: string): ReadonlyArray<ProviderOptionDescriptor> {
  return [
    {
      id: "reasoningEffort",
      label: "Reasoning",
      type: "select",
      options: [
        { id: "low", label: "Low" },
        { id: "medium", label: "Medium" },
        { id: "high", label: "High" },
        { id: "xhigh", label: "XHigh" },
        { id: "max", label: "Max" },
        { id: "ultra", label: "Ultra" },
      ],
      currentValue: "medium",
    },
    {
      id: "serviceTier",
      label: "Service Tier",
      type: "select",
      options: [
        { id: "default", label: "Standard" },
        { id: "priority", label: "Fast" },
      ],
      currentValue: serviceTier,
    },
  ];
}

describe("buildModelReasoningTriggerDisplay", () => {
  it.each(["label", "bars", "gauge"] as const)(
    "shows the selected model and reasoning as %s",
    (effortDisplay) => {
      expect(
        buildModelReasoningTriggerDisplay({
          spec,
          model: "gpt-6.1-sol",
          descriptors: descriptors("default"),
          effortDisplay,
        }),
      ).toEqual({
        modelLabel: "GPT-6.1 Sol",
        reasoningLabel: "Medium",
        reasoningGlyph:
          effortDisplay !== "label"
            ? { count: 4, filled: 2, special: null, label: "Medium" }
            : null,
        showFastModeIcon: false,
        showUltracodeIcon: false,
      });
    },
  );

  it("shows the provider-reported reasoning until one is chosen in T3", () => {
    const instanceId = ProviderInstanceId.make("codex");
    const reportedModelSelection = {
      instanceId,
      model: "gpt-6.1-sol",
      options: [{ id: "reasoningEffort", value: "high" }],
    };
    const display = (options: ReadonlyArray<{ id: string; value: string }>) =>
      buildModelReasoningTriggerDisplay({
        spec,
        model: "gpt-6.1-sol",
        descriptors: descriptors("default"),
        selection: { instanceId, model: "gpt-6.1-sol", options },
        reportedModelSelection,
      }).reasoningLabel;
    expect(display([])).toBe("High");
    expect(display([{ id: "reasoningEffort", value: "medium" }])).toBe("Medium");
  });

  it("shows the fast icon only while fast mode is active", () => {
    expect(
      buildModelReasoningTriggerDisplay({
        spec,
        model: "gpt-6.1-sol",
        descriptors: descriptors("priority"),
      }).showFastModeIcon,
    ).toBe(true);
  });

  it("shows the workflow icon only while Ultracode is on", () => {
    const display = (currentValue: boolean) =>
      buildModelReasoningTriggerDisplay({
        spec,
        model: "gpt-6.1-sol",
        descriptors: [
          ...descriptors("default"),
          { id: "ultracode", label: "Ultracode", type: "boolean", currentValue },
        ],
      }).showUltracodeIcon;
    expect(display(true)).toBe(true);
    expect(display(false)).toBe(false);
  });
});

it.each([
  { effort: "max", promptUltrathink: "none", label: "Max" },
  { effort: "high", promptUltrathink: "prefix", label: "Ultrathink" },
  { effort: "high", promptUltrathink: "body", label: "Ultrathink" },
] as const)(
  "keeps $label named in the family trigger with bars enabled ($promptUltrathink)",
  ({ effort, promptUltrathink, label }) => {
    expect(
      buildModelReasoningTriggerDisplay({
        spec: {
          columns: [],
          rows: [
            {
              model: "claude-fable-5-2",
              label: "Fable 5.2",
              variant: "Fable",
              reasoningOptions: [],
            },
          ],
        },
        model: "claude-fable-5-2",
        effortDisplay: "bars",
        promptUltrathink,
        descriptors: [
          {
            id: "effort",
            label: "Reasoning",
            type: "select",
            options: [
              { id: "low", label: "Low" },
              { id: "high", label: "High" },
              { id: "max", label: "Max" },
            ],
            currentValue: effort,
          },
        ],
      }),
    ).toEqual({
      modelLabel: "Fable 5.2",
      reasoningLabel: label,
      reasoningGlyph: null,
      showFastModeIcon: false,
      showUltracodeIcon: false,
    });
  },
);
