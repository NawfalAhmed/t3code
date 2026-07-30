import type { ProviderOptionDescriptor } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { getContextWindowControl, getFastModeControl } from "./ModelReasoningModal";

function serviceTierDescriptor(
  currentValue: string,
): Extract<ProviderOptionDescriptor, { type: "select" }> {
  return {
    id: "serviceTier",
    label: "Service Tier",
    type: "select",
    options: [
      { id: "default", label: "Standard" },
      { id: "priority", label: "Fast" },
    ],
    currentValue,
  };
}

describe("getFastModeControl", () => {
  it("maps the Codex service tier to a two-way fast mode toggle", () => {
    expect(getFastModeControl([serviceTierDescriptor("default")])).toMatchObject({
      enabled: false,
      nextValue: "priority",
    });
    expect(getFastModeControl([serviceTierDescriptor("priority")])).toMatchObject({
      enabled: true,
      nextValue: "default",
    });
  });

  it("continues to support boolean fast-mode descriptors", () => {
    expect(
      getFastModeControl([
        {
          id: "fastMode",
          label: "Fast Mode",
          type: "boolean",
          currentValue: false,
        },
      ]),
    ).toMatchObject({
      enabled: false,
      nextValue: true,
    });
  });
});

describe("getContextWindowControl", () => {
  const descriptor = (
    currentValue: string,
  ): Extract<ProviderOptionDescriptor, { type: "select" }> => ({
    id: "contextWindow",
    label: "Context Window",
    type: "select",
    options: [
      { id: "200k", label: "200k" },
      { id: "1m", label: "1M" },
    ],
    currentValue,
  });

  it("toggles between 1M and 200k", () => {
    expect(getContextWindowControl([descriptor("200k")])).toMatchObject({
      enabled: false,
      nextValue: "1m",
    });
    expect(getContextWindowControl([descriptor("1m")])).toMatchObject({
      enabled: true,
      nextValue: "200k",
    });
  });
});
