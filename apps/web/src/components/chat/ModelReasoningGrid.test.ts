import {
  ProviderDriverKind,
  type ProviderOptionDescriptor,
  type ServerProviderModel,
} from "@t3tools/contracts";
import { createModelCapabilities } from "@t3tools/shared/model";
import { describe, expect, it } from "vite-plus/test";

import { buildModelReasoningGridSpec, findNearestModelReasoningPoint } from "./ModelReasoningGrid";

function model(
  slug: string,
  reasoningOptions: ReadonlyArray<{ id: string; label: string }>,
  isCustom = false,
  descriptorId = "reasoningEffort",
): ServerProviderModel {
  const reasoning: ProviderOptionDescriptor = {
    id: descriptorId,
    label: "Reasoning",
    type: "select",
    options: [...reasoningOptions],
  };
  return {
    slug,
    name: slug,
    isCustom,
    capabilities: createModelCapabilities({ optionDescriptors: [reasoning] }),
  };
}

describe("buildModelReasoningGridSpec", () => {
  it("builds ordered model rows and reasoning columns for a Codex variant family", () => {
    const spec = buildModelReasoningGridSpec({
      provider: ProviderDriverKind.make("codex"),
      model: "gpt-5.6-terra",
      models: [
        model("gpt-5.6-luna", [
          { id: "low", label: "Low" },
          { id: "medium", label: "Medium" },
        ]),
        model("gpt-5.6-terra", [
          { id: "medium", label: "Medium" },
          { id: "high", label: "High" },
        ]),
        model("gpt-5.6-sol", [
          { id: "high", label: "High" },
          { id: "xhigh", label: "Extra High" },
        ]),
      ],
      modelOptions: [{ id: "reasoningEffort", value: "high" }],
    });

    expect(spec?.rows.map(({ model: slug, label }) => ({ slug, label }))).toEqual([
      { slug: "gpt-5.6-sol", label: "Sol" },
      { slug: "gpt-5.6-terra", label: "Terra" },
      { slug: "gpt-5.6-luna", label: "Luna" },
    ]);
    expect(spec?.columns).toEqual([
      { id: "low", label: "Low" },
      { id: "medium", label: "Medium" },
      { id: "high", label: "High" },
      { id: "xhigh", label: "XHigh" },
    ]);
  });

  it("excludes custom shadows and models outside the active family", () => {
    const spec = buildModelReasoningGridSpec({
      provider: ProviderDriverKind.make("codex"),
      model: "gpt-5.6-sol",
      models: [
        model("gpt-5.6-sol", [{ id: "high", label: "High" }]),
        model("gpt-5.6-terra", [{ id: "high", label: "High" }], true),
        model("gpt-5.7-luna", [{ id: "high", label: "High" }]),
      ],
      modelOptions: undefined,
    });

    expect(spec?.rows.map((row) => row.model)).toEqual(["gpt-5.6-sol"]);
  });

  it("falls back to the existing traits menu outside supported Codex variants", () => {
    const models = [model("gpt-5.6-sol", [{ id: "high", label: "High" }])];
    expect(
      buildModelReasoningGridSpec({
        provider: ProviderDriverKind.make("claudeAgent"),
        model: "gpt-5.6-sol",
        models,
        modelOptions: undefined,
      }),
    ).toBeNull();
    expect(
      buildModelReasoningGridSpec({
        provider: ProviderDriverKind.make("codex"),
        model: "gpt-5.4",
        models,
        modelOptions: undefined,
      }),
    ).toBeNull();
  });
});

describe("findNearestModelReasoningPoint", () => {
  const points = [
    { model: "sol", reasoning: "low", x: 20, y: 20 },
    { model: "sol", reasoning: "high", x: 100, y: 20 },
    { model: "luna", reasoning: "low", x: 20, y: 100 },
    { model: "luna", reasoning: "high", x: 100, y: 100 },
  ];

  it("snaps horizontally and vertically to the nearest available point", () => {
    expect(findNearestModelReasoningPoint(points, 91, 28)).toEqual({
      model: "sol",
      reasoning: "high",
    });
    expect(findNearestModelReasoningPoint(points, 28, 91)).toEqual({
      model: "luna",
      reasoning: "low",
    });
  });

  it("returns null when there are no available points", () => {
    expect(findNearestModelReasoningPoint([], 50, 50)).toBeNull();
  });
});

describe("expanded model families", () => {
  const options = [
    { id: "high", label: "High" },
    { id: "max", label: "Max" },
  ];

  it("places Astra first when either Astra or a GPT-5.6 variant is active", () => {
    const slugs = ["gpt-5.6-luna", "gpt-5.6-sol", "gpt-6-astra", "gpt-5.6-terra"];
    for (const active of slugs) {
      const spec = buildModelReasoningGridSpec({
        provider: ProviderDriverKind.make("codex"),
        model: active,
        models: slugs.map((slug) => model(slug, options)),
        modelOptions: undefined,
      });
      expect(spec?.rows.map((row) => row.label)).toEqual(["Astra", "Sol", "Terra", "Luna"]);
    }
  });

  it("uses Claude effort capabilities and excludes legacy Fable", () => {
    const slugs = ["claude-fable-5-1", "claude-sonnet-5", "claude-opus-5", "claude-fable-5"];
    for (const active of slugs.slice(0, 3)) {
      const spec = buildModelReasoningGridSpec({
        provider: ProviderDriverKind.make("claudeAgent"),
        model: active,
        models: slugs.map((slug) => model(slug, options, false, "effort")),
        modelOptions: [{ id: "effort", value: "max" }],
      });
      expect(spec?.rows.map((row) => row.label)).toEqual(["Fable", "Opus", "Sonnet"]);
      expect(
        spec?.rows.every((row) => row.reasoningOptions.every((option) => option.id !== "max")),
      ).toBe(true);
      expect(spec?.columns.at(-1)?.id).toBe("xhigh");
    }
  });
});
