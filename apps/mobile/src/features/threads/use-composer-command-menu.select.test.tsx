import { EnvironmentId, ProviderDriverKind, ProviderInstanceId } from "@t3tools/contracts";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vite-plus/test";

vi.mock("react-native", () => ({ Alert: { alert: vi.fn() } }));
vi.mock("../../state/queries", () => ({
  useComposerPathSearch: () => ({ entries: [], isPending: false }),
  useComposerPullRequestSearch: () => ({ entries: [], isPending: false, error: null }),
  useThreadSearch: () => undefined,
}));
vi.mock("../../state/use-composer-drafts", () => ({
  getComposerDraftSnapshot: vi.fn(),
  setComposerDraftContext: vi.fn(),
  useComposerDraftSelection: () => null,
}));
vi.mock("../../lib/uuid", () => ({ uuidv4: () => "context-id" }));
vi.mock("../../state/server", () => ({
  serverEnvironment: {
    providersValueAtom: vi.fn(),
    refreshProviders: Symbol("refreshProviders"),
  },
}));

import { makeThreadShellFixture } from "../../test-fixtures";
import { useComposerCommandMenu } from "./use-composer-command-menu";

it("/model clears only its trigger and opens the model picker", async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const onChangeDraftMessage = vi.fn();
  const onOpenModelPicker = vi.fn();
  function Probe() {
    const menu = useComposerCommandMenu({
      draftMessage: "fix this /mod",
      ownerKey: "draft",
      environmentId: null,
      projectCwd: null,
      selectedProviderStatus: null,
      hasThread: true,
      hasCompactableConversation: false,
      onChangeDraftMessage,
      onOpenModelPicker,
    });
    const model = menu.items.find((item) => item.id === "cmd:model");
    return model ? <button onClick={() => menu.onSelect(model)}>{model.label}</button> : null;
  }

  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Probe />));
    const model = container.querySelector("button");
    if (!model) throw new Error("Expected /model in the slash menu");
    await act(async () => model.click());

    expect(onOpenModelPicker).toHaveBeenCalledOnce();
    expect(onChangeDraftMessage).toHaveBeenCalledWith("fix this ");
  } finally {
    act(() => root.unmount());
  }
});

it("puts a model name match above a fuzzy thread match for @sol", async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const environmentId = EnvironmentId.make("environment-test");
  const instanceId = ProviderInstanceId.make("codex");
  function Probe() {
    const { items } = useComposerCommandMenu({
      draftMessage: "@sol",
      ownerKey: "draft",
      environmentId,
      threadShells: [
        makeThreadShellFixture({ environmentId, title: "Fix Slow GitHub pnpm Installs" }),
      ],
      projectCwd: null,
      selectedProviderStatus: null,
      hasThread: true,
      hasCompactableConversation: false,
      onChangeDraftMessage: vi.fn(),
      onOpenModelPicker: vi.fn(),
      modelOptions: [
        {
          key: "codex:gpt-6.2-sol",
          label: "GPT-6.2-Sol",
          subtitle: "",
          providerKey: "codex",
          providerLabel: "Codex",
          providerDriver: "codex",
          isDefault: false,
          isLegacy: false,
          capabilities: null,
          selection: { instanceId, model: "gpt-6.2-sol" },
        },
      ],
      modelProviders: [
        {
          instanceId,
          driver: ProviderDriverKind.make("codex"),
          enabled: true,
          installed: true,
          version: null,
          status: "ready",
          auth: { status: "authenticated" },
          checkedAt: "2026-01-01T00:00:00.000Z",
          models: [],
          slashCommands: [],
          skills: [],
        },
      ],
    });
    return (
      <ul>
        {items.map(({ id, type, label }) => (
          <li key={id}>{`${type}: ${label}`}</li>
        ))}
      </ul>
    );
  }

  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Probe />));
    expect(Array.from(container.querySelectorAll("li"), (row) => row.textContent)).toEqual([
      "model: GPT-6.2-Sol",
      "thread: Fix Slow GitHub pnpm Installs",
    ]);
  } finally {
    act(() => root.unmount());
  }
});
