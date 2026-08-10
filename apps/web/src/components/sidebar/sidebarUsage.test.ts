import {
  EnvironmentId,
  ProviderDriverKind,
  ProviderInstanceId,
  type ServerProvider,
  type ServerProviderUsageWindow,
} from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { resolveSidebarUsage } from "./sidebarUsage";

/** Every fixture reports at noon, which is the clock the figures read against. */
const CHECKED_AT = "2026-09-09T12:00:00.000Z";

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

describe("resolveSidebarUsage", () => {
  it("labels the longer windows and dates each by its own reset", () => {
    expect(
      resolveSidebarUsage(
        presentations([provider("codex", [session, weekly, monthly], "a@b.com")]),
      ),
    ).toEqual([
      {
        driver: "codex",
        windows: [
          {
            id: "session:five_hour",
            label: "Session",
            prefix: null,
            remainingPercent: 23,
            reset: "3h 20m",
          },
          {
            id: "weekly:seven_day",
            label: "Weekly",
            prefix: "Week",
            remainingPercent: 20,
            reset: "27 Sept",
          },
          {
            id: "monthly:primary",
            label: "Monthly",
            prefix: "Month",
            remainingPercent: 80,
            reset: "20 Oct",
          },
        ],
      },
    ]);
  });

  it("orders windows session first however the provider reported them", () => {
    const entries = resolveSidebarUsage(
      presentations([provider("codex", [monthly, weekly, session], "a@b.com")]),
    );
    expect(entries[0]?.windows.map((window) => window.prefix)).toEqual([null, "Week", "Month"]);
  });

  it("counts down from when the provider reported, not from render time", () => {
    // The same window read an hour earlier has an hour more of session left.
    expect(
      resolveSidebarUsage(
        presentations([provider("codex", [session], "a@b.com", "2026-09-09T11:00:00.000Z")]),
      ),
    ).toMatchObject([{ windows: [{ reset: "4h 20m" }] }]);
  });

  it("reads against the freshest account when they were probed apart", () => {
    const stale = provider("codex", [session], "one@example.com", "2026-09-09T09:00:00.000Z");
    const fresh = {
      ...provider("codex", [session], "two@example.com"),
      instanceId: ProviderInstanceId.make("work"),
    };
    expect(resolveSidebarUsage(presentations([stale, fresh]))).toMatchObject([
      { windows: [{ reset: "3h 20m" }] },
    ]);
  });

  it("counts minutes under the hour and calls a lapsed reset now", () => {
    const soon = { ...session, resetsAt: "2026-09-09T12:40:00.000Z" } as const;
    const lapsed = { ...session, resetsAt: "2026-09-09T11:40:00.000Z" } as const;
    expect(
      resolveSidebarUsage(presentations([provider("codex", [soon], "a@b.com")])),
    ).toMatchObject([{ windows: [{ reset: "40m" }] }]);
    expect(
      resolveSidebarUsage(presentations([provider("codex", [lapsed], "a@b.com")])),
    ).toMatchObject([{ windows: [{ reset: "now" }] }]);
  });

  it("shows a bare percentage for a window kind we have no word for", () => {
    const other = { ...weekly, id: "credits", kind: "other", label: "Credits" } as const;
    expect(
      resolveSidebarUsage(presentations([provider("codex", [other], "a@b.com")])),
    ).toMatchObject([
      { windows: [{ label: "Credits", prefix: null, remainingPercent: 20, reset: "27 Sept" }] },
    ]);
  });

  it("keeps only the first window of a kind, since a row fits two figures", () => {
    const opus = {
      ...weekly,
      id: "seven_day_opus",
      label: "Weekly (Opus)",
      usedPercent: 95,
    } as const;
    const entries = resolveSidebarUsage(
      presentations([provider("claudeAgent", [session, weekly, opus], "a@b.com")]),
    );
    expect(entries[0]?.windows.map((window) => window.id)).toEqual([
      "session:five_hour",
      "weekly:seven_day",
    ]);
  });

  it("pools one account reported by two environments instead of counting it twice", () => {
    const laptop = provider("codex", [weekly], "dev@example.com");
    expect(
      resolveSidebarUsage(
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
      ),
    ).toMatchObject([{ driver: "codex", windows: [{ remainingPercent: 20 }] }]);
  });

  it("averages the pool across distinct accounts on the same provider", () => {
    const entries = resolveSidebarUsage(
      presentations([
        provider("codex", [weekly], "one@example.com"),
        {
          ...provider("codex", [{ ...weekly, usedPercent: 40 }], "two@example.com"),
          instanceId: ProviderInstanceId.make("work"),
        },
      ]),
    );
    // (80 + 40) / 2 spent, so 40 points of the pool are left.
    expect(entries).toMatchObject([{ windows: [{ remainingPercent: 40 }] }]);
  });

  it("has nothing to show when a probe failed", () => {
    const failed = provider("codex", [], "dev@example.com");
    expect(
      resolveSidebarUsage(
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
      ),
    ).toEqual([]);
  });
});
