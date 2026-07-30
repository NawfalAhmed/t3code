import { ProviderDriverKind, ProviderInstanceId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import type { ProviderInstanceEntry } from "../../providerInstances";
import {
  resolveProviderToggleEntries,
  resolveProviderToggleTarget,
  shouldUseProviderToggle,
} from "./providerToggle";

function entry(instanceId: string, driverKind: "codex" | "claudeAgent"): ProviderInstanceEntry {
  return {
    instanceId: ProviderInstanceId.make(instanceId),
    driverKind: ProviderDriverKind.make(driverKind),
    displayName: instanceId,
    enabled: true,
    installed: true,
    status: "ready",
    isDefault: instanceId === driverKind,
    isAvailable: true,
    snapshot: {} as ProviderInstanceEntry["snapshot"],
    models: [],
  };
}

const codex = entry("codex", "codex");
const codexPersonal = entry("codex_personal", "codex");
const claude = entry("claudeAgent", "claudeAgent");
const cursor: ProviderInstanceEntry = {
  ...entry("cursor", "codex"),
  driverKind: ProviderDriverKind.make("cursor"),
};

const instanceId = (value: string) => ProviderInstanceId.make(value);

describe("shouldUseProviderToggle", () => {
  it("uses the icon toggle only for the supported model families", () => {
    expect(shouldUseProviderToggle("codex", "gpt-6.1-sol")).toBe(true);
    expect(shouldUseProviderToggle("claudeAgent", "claude-opus-5-5")).toBe(true);
    expect(shouldUseProviderToggle("codex", "gpt-daybreak-blue-latest")).toBe(false);
    expect(shouldUseProviderToggle("claudeAgent", "claude-opus-5")).toBe(false);
  });
});

describe("resolveProviderToggleEntries", () => {
  it("pairs the default Codex and Claude instances", () => {
    const pair = resolveProviderToggleEntries([codex, claude, cursor], instanceId("codex"));
    expect(pair?.map((candidate) => candidate.instanceId)).toEqual(["codex", "claudeAgent"]);
  });

  it("keeps the selected custom instance as its driver's side of the toggle", () => {
    const pair = resolveProviderToggleEntries(
      [codex, codexPersonal, claude],
      instanceId("codex_personal"),
    );
    expect(pair?.map((candidate) => candidate.instanceId)).toEqual([
      "codex_personal",
      "claudeAgent",
    ]);
  });

  it("does not apply when a driver is missing or a third provider is selected", () => {
    expect(resolveProviderToggleEntries([codex, cursor], instanceId("codex"))).toBeNull();
    expect(resolveProviderToggleEntries([codex, claude, cursor], instanceId("cursor"))).toBeNull();
  });

  it("shows the pinned provider alone once a thread has started", () => {
    const locked = resolveProviderToggleEntries([codex, claude], instanceId("claudeAgent"), {
      locked: true,
    });
    expect(locked?.map((candidate) => candidate.instanceId)).toEqual(["claudeAgent"]);
    expect(
      resolveProviderToggleEntries([codex, claude, cursor], instanceId("cursor"), { locked: true }),
    ).toBeNull();
  });
});

describe("resolveProviderToggleTarget", () => {
  const options = [{ id: "effort", value: "high" }] as const;

  it("restores the target instance's model and reasoning from this thread's draft", () => {
    expect(
      resolveProviderToggleTarget({
        entries: [codex, claude],
        selectedInstanceId: instanceId("codex"),
        draftSelections: {
          [instanceId("claudeAgent")]: {
            instanceId: instanceId("claudeAgent"),
            model: "claude-opus-5-5",
            options,
          },
        },
        stickySelections: {
          [instanceId("claudeAgent")]: {
            instanceId: instanceId("claudeAgent"),
            model: "claude-sonnet-5",
          },
        },
      }),
    ).toEqual({ instanceId: "claudeAgent", model: "claude-opus-5-5", options });
  });

  it("falls back to the sticky selection shared across threads", () => {
    expect(
      resolveProviderToggleTarget({
        entries: [codex, claude],
        selectedInstanceId: instanceId("claudeAgent"),
        draftSelections: {},
        stickySelections: {
          [instanceId("codex")]: {
            instanceId: instanceId("codex"),
            model: "gpt-6-luna",
            options,
          },
        },
      }),
    ).toEqual({ instanceId: "codex", model: "gpt-6-luna", options });
  });

  it("has nowhere to go when the trigger shows a single pinned provider", () => {
    expect(
      resolveProviderToggleTarget({
        entries: [claude],
        selectedInstanceId: instanceId("claudeAgent"),
        draftSelections: {},
        stickySelections: {},
      }),
    ).toBeNull();
  });

  it("defaults Claude to Opus 5.5 with high reasoning", () => {
    expect(
      resolveProviderToggleTarget({
        entries: [codex, claude],
        selectedInstanceId: instanceId("codex"),
        draftSelections: {},
        stickySelections: {},
      }),
    ).toEqual({
      instanceId: "claudeAgent",
      model: "claude-opus-5-5",
      options: [{ id: "effort", value: "high" }],
    });
  });

  it("defaults Codex to Sol with high reasoning", () => {
    expect(
      resolveProviderToggleTarget({
        entries: [codex, claude],
        selectedInstanceId: instanceId("claudeAgent"),
        draftSelections: {},
        stickySelections: {},
      }),
    ).toEqual({
      instanceId: "codex",
      model: "gpt-6.1-sol",
      options: [{ id: "reasoningEffort", value: "high" }],
    });
  });

  it("uses the preferred fallback when the remembered model is outside the active family", () => {
    expect(
      resolveProviderToggleTarget({
        entries: [codex, claude],
        selectedInstanceId: instanceId("codex"),
        draftSelections: {},
        stickySelections: {
          [instanceId("claudeAgent")]: {
            instanceId: instanceId("claudeAgent"),
            model: "claude-opus-5",
            options: [{ id: "effort", value: "low" }],
          },
        },
      }),
    ).toEqual({
      instanceId: "claudeAgent",
      model: "claude-opus-5-5",
      options: [{ id: "effort", value: "high" }],
    });
  });
});
