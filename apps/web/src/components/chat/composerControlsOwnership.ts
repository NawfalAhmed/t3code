/**
 * Where the permissions chip shows, whether the mode block overflows, and which control answers
 * the composer.mode shortcut. The model picker's footer always holds Permissions, so the chip
 * only shows while the mode differs from the default. The rule: composer.mode has one target.
 */
export function resolveComposerControlsOwnership(input: {
  /** Permissions hide while the mode is the default. */
  readonly matchesDefault: boolean;
  /** The context strip's Permissions chip then owns composer.mode. */
  readonly permissionsShownInStrip?: boolean;
  readonly collapsed: boolean;
  /** How many trailing blocks the width measurement moved into the overflow menu. */
  readonly measuredHiddenBlockCount: number;
}) {
  const accessDisplay =
    input.matchesDefault || input.permissionsShownInStrip
      ? ("hidden" as const)
      : input.collapsed
        ? ("icon" as const)
        : ("label" as const);
  const showModeBlock = accessDisplay !== "hidden";
  const modeHidden = showModeBlock && input.measuredHiddenBlockCount > 0;
  const hiddenBlockIds = modeHidden ? (["mode"] as const) : ([] as const);
  const overflowShowsPermissions = modeHidden;
  return {
    accessDisplay,
    showModeBlock,
    hiddenBlockCount: hiddenBlockIds.length,
    hiddenBlockIds,
    overflowShowsPermissions,
    /** Without a visible chip or an overflow menu holding it, the model picker answers composer.mode. */
    pickerOwnsModeShortcut:
      !input.permissionsShownInStrip &&
      !overflowShowsPermissions &&
      (accessDisplay === "hidden" || modeHidden),
  };
}
