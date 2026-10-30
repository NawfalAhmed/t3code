import { describe, expect, it } from "vite-plus/test";

import {
  resolveThreadDetailsVisibility,
  setThreadDetailsItem,
  THREAD_DETAILS_ITEMS,
} from "./threadDetailsItems";

const usage = THREAD_DETAILS_ITEMS.find((item) => item.id === "usage")!;
const context = THREAD_DETAILS_ITEMS.find((item) => item.id === "context")!;
const servers = THREAD_DETAILS_ITEMS.find((item) => item.id === "servers")!;

describe("thread details items", () => {
  it.each([
    { legacy: false, items: {}, usage: false, context: false },
    { legacy: true, items: {}, usage: true, context: true },
    { legacy: true, items: { usage: false }, usage: false, context: false },
    { legacy: false, items: { usage: true, retired: false }, usage: true, context: true },
    { legacy: false, items: { usage: true, context: false }, usage: true, context: false },
    { legacy: false, items: { usage: false, context: true }, usage: false, context: true },
  ])("resolves separate Usage and Context choices while preserving old preferences: %o", (row) => {
    const visibility = resolveThreadDetailsVisibility({
      threadDetailsItems: row.items,
      threadDetailsUsageEnabled: row.legacy,
    });
    expect(visibility.usage).toBe(row.usage);
    expect(visibility.context).toBe(row.context);
    expect(visibility.servers).toBe(true);
  });

  it("stores independent choices while preserving the former combined preference", () => {
    const legacyOn = { threadDetailsItems: {}, threadDetailsUsageEnabled: true };
    expect(setThreadDetailsItem(legacyOn, usage, false)).toEqual({ usage: false, context: true });
    expect(setThreadDetailsItem(legacyOn, usage, true)).toEqual({ context: true });

    for (const usageVisible of [false, true]) {
      for (const contextVisible of [false, true]) {
        const settings = {
          threadDetailsItems: { usage: usageVisible },
          threadDetailsUsageEnabled: false,
        };
        const contextChanged = {
          ...settings,
          threadDetailsItems: setThreadDetailsItem(settings, context, contextVisible),
        };
        expect(resolveThreadDetailsVisibility(contextChanged)).toMatchObject({
          usage: usageVisible,
          context: contextVisible,
        });
        const usageChanged = {
          ...contextChanged,
          threadDetailsItems: setThreadDetailsItem(contextChanged, usage, !usageVisible),
        };
        expect(resolveThreadDetailsVisibility(usageChanged)).toMatchObject({
          usage: !usageVisible,
          context: contextVisible,
        });
        expect(
          resolveThreadDetailsVisibility({
            ...settings,
            threadDetailsItems: setThreadDetailsItem(settings, usage, !usageVisible),
          }),
        ).toMatchObject({ usage: !usageVisible, context: usageVisible });
      }
    }

    const hidden = { threadDetailsItems: { servers: false }, threadDetailsUsageEnabled: false };
    expect(setThreadDetailsItem(hidden, servers, true)).toEqual({});
  });
});
