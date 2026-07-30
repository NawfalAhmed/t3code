import type {
  ModelSelection,
  ProviderInstanceId,
  ProviderOptionSelection,
} from "@t3tools/contracts";

import type { ProviderInstanceEntry } from "../../providerInstances";
import { getModelPickerVariant } from "./modelPickerVariants";

/** The two drivers the composer trigger can flip between, in display order. */
const PROVIDER_TOGGLE_DRIVER_KINDS = ["codex", "claudeAgent"] as const;

/** The icon toggle is paired with the family reasoning grid, not the generic picker. */
export function shouldUseProviderToggle(driverKind: string, model: string): boolean {
  return getModelPickerVariant(model, driverKind) !== null;
}

const PROVIDER_TOGGLE_FALLBACKS = {
  codex: {
    model: "gpt-6.1-sol",
    options: [{ id: "reasoningEffort", value: "high" }],
  },
  claudeAgent: {
    model: "claude-opus-5-5",
    options: [{ id: "effort", value: "high" }],
  },
} as const satisfies Record<
  (typeof PROVIDER_TOGGLE_DRIVER_KINDS)[number],
  { model: string; options: ReadonlyArray<ProviderOptionSelection> }
>;

/**
 * The provider icons the composer trigger shows, in display order, or null when
 * the trigger should fall back to the model label. A thread that cannot hand off
 * to another provider is pinned, so `locked` narrows the trigger to that one icon.
 * Null also covers an unconfigured driver and a third provider such as Cursor.
 */
export function resolveProviderToggleEntries(
  entries: ReadonlyArray<ProviderInstanceEntry>,
  selectedInstanceId: ProviderInstanceId,
  options?: { readonly locked?: boolean },
): ReadonlyArray<ProviderInstanceEntry> | null {
  const selected = entries.find((candidate) => candidate.instanceId === selectedInstanceId);
  if (
    !selected ||
    !PROVIDER_TOGGLE_DRIVER_KINDS.some((driverKind) => driverKind === selected.driverKind)
  ) {
    return null;
  }
  if (options?.locked === true) {
    return [selected];
  }
  const pair: ProviderInstanceEntry[] = [];
  for (const driverKind of PROVIDER_TOGGLE_DRIVER_KINDS) {
    // The selected instance wins for its own driver so a custom Codex account
    // stays selected instead of snapping back to the built-in one.
    const entry =
      selected.driverKind === driverKind
        ? selected
        : entries.find((candidate) => candidate.driverKind === driverKind);
    if (!entry) return null;
    pair.push(entry);
  }
  return pair;
}

/**
 * Where a toggle click lands. The model and reasoning come from the target
 * instance's last use — this thread's draft first, then the sticky selection
 * shared across threads — when it belongs to the supported picker family.
 * Otherwise the toggle lands on the provider's preferred high-reasoning model.
 */
export function resolveProviderToggleTarget(input: {
  entries: ReadonlyArray<ProviderInstanceEntry>;
  selectedInstanceId: ProviderInstanceId;
  draftSelections: Partial<Record<ProviderInstanceId, ModelSelection>>;
  stickySelections: Partial<Record<ProviderInstanceId, ModelSelection>>;
}): {
  instanceId: ProviderInstanceId;
  model: string;
  options: ReadonlyArray<ProviderOptionSelection> | undefined;
} | null {
  const target = input.entries.find((entry) => entry.instanceId !== input.selectedInstanceId);
  if (!target) return null;
  const lastUsed =
    input.draftSelections[target.instanceId] ?? input.stickySelections[target.instanceId];
  if (lastUsed && getModelPickerVariant(lastUsed.model, target.driverKind)) {
    return {
      instanceId: target.instanceId,
      model: lastUsed.model,
      options: lastUsed.options,
    };
  }
  const fallback =
    PROVIDER_TOGGLE_FALLBACKS[target.driverKind as (typeof PROVIDER_TOGGLE_DRIVER_KINDS)[number]];
  return {
    instanceId: target.instanceId,
    model: fallback.model,
    options: fallback.options,
  };
}
