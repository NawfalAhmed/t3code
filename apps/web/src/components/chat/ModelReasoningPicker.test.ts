import type { ProviderOptionDescriptor } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import type { ModelReasoningGridSpec } from "./ModelReasoningGrid";
import { buildModelReasoningTriggerDisplay } from "./ModelReasoningPicker";

const spec: ModelReasoningGridSpec = {
  columns: [
    { id: "low", label: "Low" },
    { id: "medium", label: "Medium" },
    { id: "high", label: "High" },
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
  it.each(["label", "bars"] as const)(
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
          effortDisplay === "bars" ? { count: 3, filled: 2, special: null, label: "Medium" } : null,
        showFastModeIcon: false,
      });
    },
  );

  it("shows the fast icon only while fast mode is active", () => {
    expect(
      buildModelReasoningTriggerDisplay({
        spec,
        model: "gpt-6.1-sol",
        descriptors: descriptors("priority"),
      }).showFastModeIcon,
    ).toBe(true);
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
              model: "claude-fable-5-1",
              label: "Fable 5.1",
              variant: "Fable",
              reasoningOptions: [],
            },
          ],
        },
        model: "claude-fable-5-1",
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
      modelLabel: "Fable 5.1",
      reasoningLabel: label,
      reasoningGlyph: null,
      showFastModeIcon: false,
    });
  },
);
