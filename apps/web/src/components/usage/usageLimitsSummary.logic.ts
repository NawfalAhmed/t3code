import type { ServerProvider, ServerProviderUsageWindow } from "@t3tools/contracts";
import {
  collectLimitAccounts,
  collectLimitPools,
  formatDuration,
  type LimitPoolWindow,
} from "@t3tools/shared/usageLimits";

const DAY = 24 * 60 * 60 * 1_000;

/** How close a reset must be before it is called out. Kinds left out never are. */
const RESET_SOON_WITHIN: Partial<Record<ServerProviderUsageWindow["kind"], number>> = {
  session: 30 * 60 * 1_000,
  weekly: 12 * 60 * 60 * 1_000,
};

const resetDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

/** Column headings; a kind without a word of its own takes the provider's name for the window. */
const KIND_PREFIX: Record<ServerProviderUsageWindow["kind"], string | null> = {
  session: "5hr",
  weekly: "Week",
  monthly: "Month",
  other: null,
};

export interface UsageLimitsSummaryWindow {
  readonly id: string;
  readonly kind: ServerProviderUsageWindow["kind"];
  /** The provider's own name for the window, for the spoken summary. */
  readonly label: string;
  readonly prefix: string;
  readonly remainingPercent: number;
  /** `3h 10m` while the reset is less than a day out, else `27 Sept`. */
  readonly reset: string | null;
  readonly resetSoon: boolean;
}

export interface UsageLimitsSummaryEntry {
  readonly driver: ServerProvider["driver"];
  /** Session first, then weekly, monthly, other: one window per kind. */
  readonly windows: readonly UsageLimitsSummaryWindow[];
  /** Banked reset credits across the pool's accounts; null when none of them report any. */
  readonly resetCredits: number | null;
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
      const untilReset = (window.resets[0]?.at ?? Infinity) - now;
      return [
        {
          id: `${window.kind}:${window.id}`,
          kind: window.kind,
          label: window.label,
          prefix: KIND_PREFIX[window.kind] ?? window.label,
          remainingPercent: window.remainingPercent,
          reset: formatReset(window, now),
          resetSoon: untilReset <= (RESET_SOON_WITHIN[window.kind] ?? -Infinity),
        },
      ];
    });
    const credits = pool.accounts.flatMap(
      (account) => account.limits.resetCredits?.availableCount ?? [],
    );
    const resetCredits = credits.length === 0 ? null : credits.reduce((a, b) => a + b, 0);
    return windows.length === 0 ? [] : [{ driver: pool.driver, windows, resetCredits }];
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
