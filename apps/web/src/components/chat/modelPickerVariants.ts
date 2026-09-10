type ModelPickerModel = {
  slug: string;
  name: string;
  shortName?: string;
  driverKind: string;
  instanceId: string;
  isCustom?: boolean;
};

const MODEL_VARIANTS = {
  "gpt-6-astra": { family: "GPT 5/6", variant: "astra", label: "Astra", priority: 0 },
  "gpt-5.6-sol": { family: "GPT 5/6", variant: "sol", label: "Sol", priority: 1 },
  "gpt-5.6-terra": { family: "GPT 5/6", variant: "terra", label: "Terra", priority: 2 },
  "gpt-5.6-luna": { family: "GPT 5/6", variant: "luna", label: "Luna", priority: 3 },
  "claude-fable-5-1": { family: "Claude 5", variant: "fable", label: "Fable", priority: 0 },
  "claude-opus-5": { family: "Claude 5", variant: "opus", label: "Opus", priority: 1 },
  "claude-sonnet-5": { family: "Claude 5", variant: "sonnet", label: "Sonnet", priority: 2 },
} as const;

export type ModelVariant = (typeof MODEL_VARIANTS)[keyof typeof MODEL_VARIANTS]["variant"];

export function getModelPickerVariant(slug: string, driverKind: string, isCustom = false) {
  if (isCustom) return null;
  const key = slug.toLowerCase();
  if (!Object.hasOwn(MODEL_VARIANTS, key)) return null;
  const variant = MODEL_VARIANTS[key as keyof typeof MODEL_VARIANTS];
  const expectedDriver = variant.family === "Claude 5" ? "claudeAgent" : "codex";
  return driverKind === expectedDriver ? variant : null;
}

export function getModelPickerFamilyDisplayModel<
  T extends { slug: string; name: string; isCustom?: boolean },
>(model: T, driverKind: string): T {
  const variant = getModelPickerVariant(model.slug, driverKind, model.isCustom);
  return variant ? { ...model, name: variant.family, shortName: variant.family } : model;
}

/** Keep each instance's active variant when presenting a family as one entry. */
export function collapseModelVariants<T extends ModelPickerModel>(
  models: ReadonlyArray<T>,
  activeInstanceId: string,
  activeModel: string,
): T[] {
  const representativeByInstance = new Map<string, { model: T; priority: number }>();
  const familyKey = (model: T, family: string) => JSON.stringify([model.instanceId, family]);
  for (const model of models) {
    const variant = getModelPickerVariant(model.slug, model.driverKind, model.isCustom);
    if (!variant) continue;
    const isActive =
      model.instanceId === activeInstanceId &&
      model.slug.toLowerCase() === activeModel.toLowerCase();
    const priority = isActive ? -1 : variant.priority;
    const key = familyKey(model, variant.family);
    const current = representativeByInstance.get(key);
    if (!current || priority < current.priority) {
      representativeByInstance.set(key, { model, priority });
    }
  }

  const collapsedFamilies = new Set<string>();
  return models.flatMap((model) => {
    const variant = getModelPickerVariant(model.slug, model.driverKind, model.isCustom);
    if (!variant) return [model];
    const key = familyKey(model, variant.family);
    if (collapsedFamilies.has(key)) return [];
    collapsedFamilies.add(key);
    const representative = representativeByInstance.get(key)?.model;
    return representative
      ? [getModelPickerFamilyDisplayModel(representative, representative.driverKind)]
      : [];
  });
}
