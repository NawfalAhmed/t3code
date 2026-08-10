import {
  EnvironmentId,
  ProviderDriverKind,
  ProviderInstanceId,
  type ServerProvider,
  type ServerProviderUsageWindow,
} from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { resolveUsageLimitsSummary } from "./usageLimitsSummary.logic";

/** Every fixture reports at noon and is read at noon unless a test moves the clock. */
const CHECKED_AT = "2026-09-09T12:00:00.000Z";
const NOW = Date.parse(CHECKED_AT);

const session = {
  id: "five_hour",
  kind: "session",
  label: "Session",
  usedPercent: 77,
  windowDurationMins: 300,
  resetsAt: "2026-09-09T15:20:00.000Z",
} as const satisfies ServerProviderUsageWindow;

const weekly = {
  id: "seven_day",
  kind: "weekly",
  label: "Weekly",
  usedPercent: 80,
  windowDurationMins: 7 * 24 * 60,
  resetsAt: "2026-09-27T09:00:00.000Z",
} as const satisfies ServerProviderUsageWindow;

const monthly = {
  id: "primary",
  kind: "monthly",
  label: "Monthly",
  usedPercent: 20,
  windowDurationMins: 30 * 24 * 60,
  resetsAt: "2026-10-20T09:00:00.000Z",
} as const satisfies ServerProviderUsageWindow;

function provider(
  driver: string,
  windows: readonly ServerProviderUsageWindow[],
  email: string,
  checkedAt: string = CHECKED_AT,
): ServerProvider {
  return {
    instanceId: ProviderInstanceId.make(driver),
    driver: ProviderDriverKind.make(driver),
    enabled: true,
    installed: true,
    version: null,
    status: "ready",
    auth: { status: "authenticated", email },
    checkedAt,
    models: [],
    slashCommands: [],
    skills: [],
    usageLimits: { checkedAt, windows },
  };
}

function presentations(providers: readonly ServerProvider[]) {
  return new Map([
    [
      EnvironmentId.make("env-a"),
      { entry: { target: { label: "Laptop" } }, serverConfig: { providers } },
    ],
  ]) as never;
}

describe("resolveUsageLimitsSummary", () => {
  it("labels the longer windows and dates each by its own reset", () => {
    expect(
      resolveUsageLimitsSummary(
        presentations([provider("codex", [session, weekly, monthly], "a@b.com")]),
        NOW,
      ),
    ).toEqual([
      {
        driver: "codex",
        windows: [
          {
            id: "session:session",
            kind: "session",
            label: "Session",
            prefix: "5hr",
            remainingPercent: 23,
            reset: "3h 20m",
            resetSoon: false,
          },
          {
            id: "weekly:weekly",
            kind: "weekly",
            label: "Weekly",
            prefix: "Week",
            remainingPercent: 20,
            reset: "27 Sept",
            resetSoon: false,
          },
          {
            id: "monthly:monthly",
            kind: "monthly",
            label: "Monthly",
            prefix: "Month",
            remainingPercent: 80,
            reset: "20 Oct",
            resetSoon: false,
          },
        ],
        resetCredits: null,
      },
    ]);
  });

  it("orders windows session first however the provider reported them", () => {
    const entries = resolveUsageLimitsSummary(
      presentations([provider("codex", [monthly, weekly, session], "a@b.com")]),
      NOW,
    );
    expect(entries[0]?.windows.map((window) => window.prefix)).toEqual(["5hr", "Week", "Month"]);
  });

  it("calls out a session reset within 30 minutes and a weekly one within 12 hours", () => {
    const resetSoon = (window: ServerProviderUsageWindow, resetsAt: string) =>
      resolveUsageLimitsSummary(
        presentations([provider("codex", [{ ...window, resetsAt }], "a@b.com")]),
        NOW,
      )[0]?.windows[0]?.resetSoon;
    expect(resetSoon(session, "2026-09-09T12:31:00.000Z")).toBe(false);
    expect(resetSoon(session, "2026-09-09T12:30:00.000Z")).toBe(true);
    expect(resetSoon(weekly, "2026-09-10T00:01:00.000Z")).toBe(false);
    expect(resetSoon(weekly, "2026-09-10T00:00:00.000Z")).toBe(true);
    expect(resetSoon(monthly, "2026-09-09T12:10:00.000Z")).toBe(false);
  });

  it("counts down against the live clock, not when the provider reported", () => {
    const reported = presentations([
      provider("codex", [session], "a@b.com", "2026-09-09T11:00:00.000Z"),
    ]);
    expect(resolveUsageLimitsSummary(reported, NOW)).toMatchObject([
      { windows: [{ reset: "3h 20m" }] },
    ]);
    expect(resolveUsageLimitsSummary(reported, NOW + 60 * 60 * 1_000)).toMatchObject([
      { windows: [{ reset: "2h 20m" }] },
    ]);
  });

  it("counts minutes under the hour and calls a lapsed reset now", () => {
    const soon = { ...session, resetsAt: "2026-09-09T12:40:00.000Z" } as const;
    const lapsed = { ...session, resetsAt: "2026-09-09T11:40:00.000Z" } as const;
    expect(
      resolveUsageLimitsSummary(presentations([provider("codex", [soon], "a@b.com")]), NOW),
    ).toMatchObject([{ windows: [{ reset: "40m" }] }]);
    expect(
      resolveUsageLimitsSummary(presentations([provider("codex", [lapsed], "a@b.com")]), NOW),
    ).toMatchObject([{ windows: [{ reset: "now" }] }]);
  });

  it("heads a window kind we have no word for with the provider's name for it", () => {
    const other = { ...weekly, id: "credits", kind: "other", label: "Credits" } as const;
    expect(
      resolveUsageLimitsSummary(presentations([provider("codex", [other], "a@b.com")]), NOW),
    ).toMatchObject([
      {
        windows: [{ label: "Credits", prefix: "Credits", remainingPercent: 20, reset: "27 Sept" }],
      },
    ]);
  });

  it("keeps only the first window of a kind, since a row fits two figures", () => {
    const opus = {
      ...weekly,
      id: "seven_day_opus",
      label: "Weekly (Opus)",
      usedPercent: 95,
    } as const;
    const entries = resolveUsageLimitsSummary(
      presentations([provider("claudeAgent", [session, weekly, opus], "a@b.com")]),
      NOW,
    );
    expect(entries[0]?.windows.map((window) => window.id)).toEqual([
      "session:five_hour",
      "weekly:seven_day",
    ]);
  });

  it("pools one account reported by two environments instead of counting it twice", () => {
    const laptop = provider("codex", [weekly], "dev@example.com");
    expect(
      resolveUsageLimitsSummary(
        new Map([
          [
            EnvironmentId.make("env-a"),
            { entry: { target: { label: "Laptop" } }, serverConfig: { providers: [laptop] } },
          ],
          [
            EnvironmentId.make("env-b"),
            { entry: { target: { label: "Desktop" } }, serverConfig: { providers: [laptop] } },
          ],
        ]) as never,
        NOW,
      ),
    ).toMatchObject([{ driver: "codex", windows: [{ remainingPercent: 20 }] }]);
  });

  it("averages the pool across distinct accounts on the same provider", () => {
    const entries = resolveUsageLimitsSummary(
      presentations([
        provider("codex", [weekly], "one@example.com"),
        {
          ...provider("codex", [{ ...weekly, usedPercent: 40 }], "two@example.com"),
          instanceId: ProviderInstanceId.make("work"),
        },
      ]),
      NOW,
    );
    // (80 + 40) / 2 spent, so 40 points of the pool are left.
    expect(entries).toMatchObject([{ windows: [{ remainingPercent: 40 }] }]);
  });

  it("banks reset credits across the pool's accounts", () => {
    const withCredits = (email: string, id: string, availableCount: number): ServerProvider => ({
      ...provider("codex", [weekly], email),
      instanceId: ProviderInstanceId.make(id),
      usageLimits: { checkedAt: CHECKED_AT, windows: [weekly], resetCredits: { availableCount } },
    });
    const entries = resolveUsageLimitsSummary(
      presentations([
        withCredits("one@example.com", "codex", 2),
        withCredits("two@example.com", "work", 0),
        provider("claudeAgent", [weekly], "three@example.com"),
      ]),
      NOW,
    );
    expect(entries.map((entry) => entry.resetCredits)).toEqual([2, null]);
  });

  it("has nothing to show when a probe failed", () => {
    const failed = provider("codex", [], "dev@example.com");
    expect(
      resolveUsageLimitsSummary(
        presentations([
          {
            ...failed,
            usageLimits: {
              checkedAt: CHECKED_AT,
              windows: [],
              unavailable: { reason: "probeFailed" },
            },
          },
        ]),
        NOW,
      ),
    ).toEqual([]);
  });
});
