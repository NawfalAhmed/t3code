import { describe, expect, it } from "vite-plus/test";

import { collapseModelVariants, getModelPickerFamilyDisplayModel } from "./modelPickerVariants";

const codexModels = [
  {
    slug: "gpt-5.6-sol",
    name: "GPT-5.6-Sol",
    driverKind: "codex",
    instanceId: "codex",
  },
  {
    slug: "gpt-5.6-terra",
    name: "GPT-5.6-Terra",
    driverKind: "codex",
    instanceId: "codex",
  },
  {
    slug: "gpt-5.6-luna",
    name: "GPT-5.6-Luna",
    driverKind: "codex",
    instanceId: "codex",
  },
  {
    slug: "gpt-5.5",
    name: "GPT-5.5",
    driverKind: "codex",
    instanceId: "codex",
  },
];

describe("collapseModelVariants", () => {
  it("exposes one GPT-5.6 entry that defaults to Sol", () => {
    expect(collapseModelVariants(codexModels, "codex", "gpt-5.5")).toEqual([
      {
        slug: "gpt-5.6-sol",
        name: "GPT 5/6",
        shortName: "GPT 5/6",
        driverKind: "codex",
        instanceId: "codex",
      },
      codexModels[3],
    ]);
  });

  it("preserves the active GPT-5.6 variant as the selection target", () => {
    expect(collapseModelVariants(codexModels, "codex", "gpt-5.6-terra")[0]).toMatchObject({
      slug: "gpt-5.6-terra",
      name: "GPT 5/6",
      shortName: "GPT 5/6",
    });
  });

  it("does not collapse similarly named models from other providers", () => {
    const claudeModel = {
      slug: "gpt-5.6-sol",
      name: "GPT-5.6-Sol",
      driverKind: "claudeAgent",
      instanceId: "claudeAgent",
    };

    expect(collapseModelVariants([claudeModel], "claudeAgent", claudeModel.slug)).toEqual([
      claudeModel,
    ]);
  });
});

describe("getModelPickerFamilyDisplayModel", () => {
  it("removes the variant suffix from the GPT-5.6 model trigger", () => {
    expect(getModelPickerFamilyDisplayModel(codexModels[1]!, "codex")).toMatchObject({
      slug: "gpt-5.6-terra",
      name: "GPT 5/6",
      shortName: "GPT 5/6",
    });
  });
});

const astra = {
  slug: "gpt-6-astra",
  name: "GPT-6 Astra",
  driverKind: "codex",
  instanceId: "codex",
};
const claudeModels = ["claude-opus-5", "claude-sonnet-5", "claude-fable-5-1"].map((slug) => ({
  slug,
  name: slug,
  driverKind: "claudeAgent",
  instanceId: "claude",
}));

describe("model family grouping", () => {
  it("defaults the GPT group to Astra when available and preserves an active older variant", () => {
    const models = [...codexModels, astra];
    expect(collapseModelVariants(models, "codex", "gpt-5.5")[0]?.slug).toBe("gpt-6-astra");
    expect(collapseModelVariants(models, "codex", "gpt-5.6-luna")[0]?.slug).toBe("gpt-5.6-luna");
    expect(collapseModelVariants(models, "codex", "gpt-6-astra")).toHaveLength(2);
  });

  it("groups Claude 5 while preserving each selected variant", () => {
    for (const model of claudeModels) {
      expect(collapseModelVariants(claudeModels, "claude", model.slug)).toEqual([
        { ...model, name: "Claude 5", shortName: "Claude 5" },
      ]);
      expect(getModelPickerFamilyDisplayModel(model, "claudeAgent").name).toBe("Claude 5");
    }
  });

  it("keeps instance selections independent and leaves custom and legacy models alone", () => {
    const secondInstance = claudeModels.map((model) => ({ ...model, instanceId: "claude-two" }));
    const custom = { ...claudeModels[0]!, isCustom: true };
    const legacy = { ...claudeModels[0]!, slug: "claude-fable-5" };
    const result = collapseModelVariants(
      [...codexModels, astra, ...claudeModels, ...secondInstance, custom, legacy],
      "claude-two",
      "claude-fable-5-1",
    );
    expect(result.map((model) => [model.instanceId, model.slug])).toEqual([
      ["codex", "gpt-6-astra"],
      ["codex", "gpt-5.5"],
      ["claude", "claude-fable-5-1"],
      ["claude-two", "claude-fable-5-1"],
      ["claude", custom.slug],
      ["claude", legacy.slug],
    ]);
    expect(result.slice(-2)).toEqual([custom, legacy]);
  });
});
