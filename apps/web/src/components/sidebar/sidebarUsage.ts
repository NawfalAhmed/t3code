import type { ServerProvider, ServerProviderUsageWindow } from "@t3tools/contracts";
import {
  collectLimitAccounts,
  collectLimitPools,
  formatDuration,
  type LimitAccount,
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

export interface SidebarUsageWindow {
  readonly id: string;
  /** The provider's own name for the window, for the spoken summary. */
  readonly label: string;
  readonly prefix: string | null;
  readonly remainingPercent: number;
  /** `3h 10m` while the reset is less than a day out, else `27 Sept`. */
  readonly reset: string | null;
}

export interface SidebarUsageEntry {
  readonly driver: ServerProvider["driver"];
  /** Session first, then weekly, monthly, other: one window per kind. */
  readonly windows: readonly SidebarUsageWindow[];
}

/**
 * One row per provider that reports subscription limits, pooled from the same
 * accounts Usage → Limits draws so the two views can never disagree.
 *
 * A provider can report several windows of one kind (Claude prices its
 * model-scoped allowances as extra weeklies), and a sidebar row fits two
 * figures. Only the first window of each kind makes it in; the page is where
 * the rest live.
 */
export function resolveSidebarUsage(
  presentations: Parameters<typeof collectLimitAccounts>[0],
): readonly SidebarUsageEntry[] {
  const accounts = collectLimitAccounts(presentations);
  const now = freshestCheckedAt(accounts);
  return collectLimitPools(accounts, now).flatMap((pool) => {
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

/**
 * The clock the figures are read against: when the provider last reported
 * them, not when this render happened. The sidebar outlives any page, so a
 * mount-time clock would drift and overstate every countdown.
 */
function freshestCheckedAt(accounts: readonly LimitAccount[]): number {
  let freshest = 0;
  for (const account of accounts) {
    const at = Date.parse(account.limits.checkedAt);
    if (Number.isFinite(at) && at > freshest) {
      freshest = at;
    }
  }
  return freshest;
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
