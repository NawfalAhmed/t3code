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
      model: "gpt-5.6-sol",
      label: "Sol",
      variant: "sol",
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
  it("shows the selected model variant and reasoning level", () => {
    expect(
      buildModelReasoningTriggerDisplay({
        spec,
        model: "gpt-5.6-sol",
        descriptors: descriptors("default"),
      }),
    ).toEqual({
      modelLabel: "Sol",
      reasoningLabel: "Medium",
      showFastModeIcon: false,
    });
  });

  it("shows the fast icon only while fast mode is active", () => {
    expect(
      buildModelReasoningTriggerDisplay({
        spec,
        model: "gpt-5.6-sol",
        descriptors: descriptors("priority"),
      }).showFastModeIcon,
    ).toBe(true);
  });
});

it("shows the Claude effort selection in the family trigger", () => {
  expect(
    buildModelReasoningTriggerDisplay({
      spec: {
        columns: [],
        rows: [
          { model: "claude-fable-5-1", label: "Fable", variant: "fable", reasoningOptions: [] },
        ],
      },
      model: "claude-fable-5-1",
      descriptors: [
        {
          id: "effort",
          label: "Reasoning",
          type: "select",
          options: [{ id: "max", label: "Max" }],
          currentValue: "max",
        },
      ],
    }),
  ).toEqual({ modelLabel: "Fable", reasoningLabel: "Max", showFastModeIcon: false });
});
