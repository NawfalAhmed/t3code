import type { ProviderDriverKind } from "@t3tools/contracts";

export type ProviderIconState = "active" | "inactive" | "default";

const ICON_OPACITY = {
  codex: { active: 0.8, inactive: 0.3, default: 0.6 },
  claudeAgent: { active: 1, inactive: 0.4, default: 0.7 },
} as const;

export function providerIconOpacity(
  driverKind: ProviderDriverKind,
  state: ProviderIconState = "default",
) {
  return (driverKind === "claudeAgent" ? ICON_OPACITY.claudeAgent : ICON_OPACITY.codex)[state];
}
