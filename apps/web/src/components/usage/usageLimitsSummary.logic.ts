import type { ServerProvider, ServerProviderUsageWindow } from "@t3tools/contracts";
import {
  collectLimitAccounts,
  collectLimitPools,
  formatDuration,
  type LimitPoolWindow,
} from "@t3tools/shared/usageLimits";

const DAY = 24 * 60 * 60 * 1_000;

const resetDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

/** The session leads the line and needs no naming; the longer windows do. */
const KIND_PREFIX: Record<ServerProviderUsageWindow["kind"], string | null> = {
  session: null,
  weekly: "Week",
  monthly: "Month",
  other: null,
};

export interface UsageLimitsSummaryWindow {
  readonly id: string;
  /** The provider's own name for the window, for the spoken summary. */
  readonly label: string;
  readonly prefix: string | null;
  readonly remainingPercent: number;
  /** `3h 10m` while the reset is less than a day out, else `27 Sept`. */
  readonly reset: string | null;
}

export interface UsageLimitsSummaryEntry {
  readonly driver: ServerProvider["driver"];
  /** Session first, then weekly, monthly, other: one window per kind. */
  readonly windows: readonly UsageLimitsSummaryWindow[];
}

// Pooled from the same accounts as Usage → Limits so the two views never disagree.
// A row fits two figures, so only the first window of each kind makes it in
// (Claude reports model-scoped allowances as extra weeklies); the page has the rest.
export function resolveUsageLimitsSummary(
  presentations: Parameters<typeof collectLimitAccounts>[0],
  now: number,
): readonly UsageLimitsSummaryEntry[] {
  return collectLimitPools(collectLimitAccounts(presentations), now).flatMap((pool) => {
    const seen = new Set<ServerProviderUsageWindow["kind"]>();
    const windows = pool.windows.flatMap((window) => {
      if (seen.has(window.kind)) {
        return [];
      }
      seen.add(window.kind);
      return [
        {
          id: `${window.kind}:${window.id}`,
          label: window.label,
          prefix: KIND_PREFIX[window.kind],
          remainingPercent: window.remainingPercent,
          reset: formatReset(window, now),
        },
      ];
    });
    return windows.length === 0 ? [] : [{ driver: pool.driver, windows }];
  });
}

function formatReset(window: LimitPoolWindow, now: number): string | null {
  const at = window.resets[0]?.at;
  if (at === undefined) {
    return null;
  }
  const remaining = at - now;
  if (remaining <= 0) {
    return "now";
  }
  return remaining >= DAY ? resetDateFormatter.format(at) : formatDuration(remaining);
}
