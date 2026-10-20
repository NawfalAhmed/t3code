import { ProviderDriverKind, ProviderInstanceId } from "@t3tools/contracts";
import { useRef, useState } from "react";
import { expect, it } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

import { render } from "../../../test/render";
import { deriveProviderInstanceEntries } from "../../providerInstances";
import {
  ComposerPromptEditorTiptap,
  type ComposerPromptEditorHandle,
} from "../ComposerPromptEditorTiptap";
import { ModelMentionMenu, useModelMentionMenu } from "./useModelMentionMenu";

function Prompt() {
  const editorRef = useRef<ComposerPromptEditorHandle>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState({ value: "", cursor: 0 });
  const instanceId = ProviderInstanceId.make("claudeAgent");
  const mentions = useModelMentionMenu({
    editorRef,
    instanceEntries: deriveProviderInstanceEntries([
      {
        instanceId,
        driver: ProviderDriverKind.make("claudeAgent"),
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
    ]),
    modelOptionsByInstance: new Map([
      [instanceId, [{ slug: "claude-sonnet-5-5", name: "Claude Sonnet 5.5" }]],
    ]),
    onReplace: (value, cursor) => setDraft({ value, cursor }),
  });
  return (
    <div ref={anchor}>
      <output aria-label="Draft">{draft.value}</output>
      <ComposerPromptEditorTiptap
        ariaLabel="Prompt"
        editorRef={editorRef}
        value={draft.value}
        cursor={draft.cursor}
        contextRecords={new Map()}
        skills={[]}
        disabled={false}
        placeholder="Prompt"
        {...mentions.editorProps}
        onChange={(value, cursor, expandedCursor, adjacent) => {
          setDraft({ value, cursor });
          mentions.onPromptChange(value, expandedCursor, adjacent);
        }}
        onPaste={() => {}}
      />
      <ModelMentionMenu menu={mentions.menu} anchor={anchor} />
    </div>
  );
}

it.each(["click", "keyboard"])(
  "keeps a model mention after selecting by %s and continuing to type",
  async (method) => {
    await using screen = await render(<Prompt />);
    const editor = screen.getByRole("textbox", { name: "Prompt" });
    await editor.click();
    await userEvent.keyboard("@sonnet");
    const option = page.getByRole("option", { name: /Claude Sonnet 5.5/ });
    await expect.element(option).toBeVisible();
    if (method === "click") await option.click();
    else await userEvent.keyboard("{Enter}");
    await expect
      .element(screen.getByRole("status", { name: "Draft" }))
      .toHaveTextContent("model:claudeAgent/claude-sonnet-5-5");
    await userEvent.keyboard("continue");
    await expect
      .element(screen.getByRole("status", { name: "Draft" }))
      .toHaveTextContent("model:claudeAgent/claude-sonnet-5-5 continue");
  },
);
