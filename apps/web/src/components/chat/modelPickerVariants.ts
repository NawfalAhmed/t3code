const MODEL_VARIANTS = {
  "gpt-6-astra": { family: "GPT 6", variant: "Astra", label: "GPT-6 Astra", priority: 0 },
  "gpt-6.1-sol": { family: "GPT 6", variant: "Sol", label: "GPT-6.1 Sol", priority: 1 },
  "gpt-6.1-terra": { family: "GPT 6", variant: "Terra", label: "GPT-6.1 Terra", priority: 2 },
  "gpt-6-luna": { family: "GPT 6", variant: "Luna", label: "GPT-6 Luna", priority: 3 },
  "claude-fable-5-1": { family: "Claude", variant: "Fable", label: "Fable 5.1", priority: 0 },
  "claude-opus-5-5": { family: "Claude", variant: "Opus", label: "Opus 5.5", priority: 1 },
  "claude-sonnet-5-5": { family: "Claude", variant: "Sonnet", label: "Sonnet 5.5", priority: 2 },
  "claude-haiku-5-5": { family: "Claude", variant: "Haiku", label: "Haiku 5.5", priority: 3 },
} as const;

export type ModelVariant = (typeof MODEL_VARIANTS)[keyof typeof MODEL_VARIANTS]["variant"];

/**
 * Resolve the grid row a model slug belongs to. Returns null for custom models,
 * unknown slugs, and slugs claimed by a different driver so the composer falls
 * back to the plain traits picker.
 */
export function getModelPickerVariant(slug: string, driverKind: string, isCustom = false) {
  if (isCustom) return null;
  const key = slug.toLowerCase();
  if (!Object.hasOwn(MODEL_VARIANTS, key)) return null;
  const variant = MODEL_VARIANTS[key as keyof typeof MODEL_VARIANTS];
  const expectedDriver = variant.family === "Claude" ? "claudeAgent" : "codex";
  return driverKind === expectedDriver ? variant : null;
}
