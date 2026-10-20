import type { ProviderInstanceId } from "@t3tools/contracts";
import { type RefObject, useId, useState } from "react";

import { collapseExpandedComposerCursor, detectComposerTrigger } from "../../composer-logic";
import { useTheme } from "../../hooks/useTheme";
import type { ProviderInstanceEntry } from "../../providerInstances";
import type { ComposerPromptEditorHandle } from "../ComposerPromptEditorTiptap";
import { Popover, PopoverPopup } from "../ui/popover";
import { ComposerCommandMenu, composerSuggestionOptionId } from "./ComposerCommandMenu";
import {
  handleComposerMenuKey,
  resolveComposerMenuActiveItemId,
  stepComposerMenuHighlight,
} from "./composerMenuHighlight";
import { composerModelMentionReplacement, matchComposerModelItems } from "./composerModelMentions";
import type { ModelEsque } from "./providerIconUtils";
import { useComposerTriggerState } from "./useComposerTriggerState";

/**
 * `@` model mentions for a prompt editor outside the chat composer, whose menu also offers
 * files, threads and machines. The models come from the caller, so they belong to its machine.
 */
export function useModelMentionMenu(input: {
  readonly instanceEntries: ReadonlyArray<ProviderInstanceEntry>;
  readonly modelOptionsByInstance: ReadonlyMap<ProviderInstanceId, ReadonlyArray<ModelEsque>>;
  readonly editorRef: RefObject<ComposerPromptEditorHandle | null>;
  readonly onReplace: (prompt: string, cursor: number) => void;
}) {
  const listId = `${useId()}-model-mentions`;
  const { trigger, setTrigger, resolveTrigger, dismissTrigger } = useComposerTriggerState(
    () => null,
  );
  const [highlighted, setHighlighted] = useState<{ itemId: string; searchKey: string } | null>(
    null,
  );
  const mentionTrigger = trigger?.kind === "path" ? trigger : null;
  const searchKey = mentionTrigger?.query.trim().toLowerCase() ?? null;
  const items = mentionTrigger
    ? matchComposerModelItems({
        instanceEntries: input.instanceEntries,
        modelOptionsByInstance: input.modelOptionsByInstance,
        query: mentionTrigger.query,
      })
    : [];
  const activeItemId = resolveComposerMenuActiveItemId({
    items,
    highlightedItemId: highlighted?.itemId ?? null,
    currentSearchKey: searchKey,
    highlightedSearchKey: highlighted?.searchKey ?? null,
  });
  const activeItem = items.find((item) => item.id === activeItemId) ?? null;

  const highlight = (itemId: string | null) =>
    setHighlighted(itemId !== null && searchKey !== null ? { itemId, searchKey } : null);

  const select = (item: (typeof items)[number]) => {
    const editor = input.editorRef.current;
    if (!editor) return;
    const snapshot = editor.readSnapshot();
    const current = resolveTrigger(detectComposerTrigger(snapshot.value, snapshot.expandedCursor));
    if (current?.kind !== "path") return;
    const { rangeStart, rangeEnd, replacement } = composerModelMentionReplacement(
      snapshot.value,
      current,
      item,
    );
    const prompt =
      snapshot.value.slice(0, rangeStart) + replacement + snapshot.value.slice(rangeEnd);
    const cursor = collapseExpandedComposerCursor(prompt, rangeStart + replacement.length);
    input.onReplace(prompt, cursor);
    setTrigger(null);
    window.requestAnimationFrame(() => {
      const currentEditor = input.editorRef.current;
      if (currentEditor?.readSnapshot().value === prompt) currentEditor.focusAt(cursor);
    });
  };

  return {
    onPromptChange: (prompt: string, expandedCursor: number, cursorAdjacentToMention: boolean) =>
      setTrigger(cursorAdjacentToMention ? null : detectComposerTrigger(prompt, expandedCursor)),
    editorProps: {
      suggestionListId: listId,
      activeSuggestionId:
        mentionTrigger && activeItem
          ? composerSuggestionOptionId(listId, activeItem.id)
          : undefined,
      onCommandKeyDown: (key: string, event: KeyboardEvent) => {
        if (!mentionTrigger || event.isComposing || event.keyCode === 229) return false;
        if (key === "Escape") {
          dismissTrigger(trigger);
          return true;
        }
        if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return false;
        return handleComposerMenuKey(key, {
          items,
          activeItem,
          nudge: (direction) =>
            highlight(stepComposerMenuHighlight(items, activeItemId, direction)?.id ?? null),
          select,
        });
      },
    },
    menu: {
      open: mentionTrigger !== null,
      listId,
      items,
      activeItemId,
      onHighlightedItemChange: highlight,
      onSelect: select,
      onClose: () => dismissTrigger(trigger),
    },
  };
}

export function ModelMentionMenu(props: {
  readonly menu: ReturnType<typeof useModelMentionMenu>["menu"];
  readonly anchor: RefObject<HTMLElement | null>;
}) {
  const { resolvedTheme } = useTheme();
  const { menu } = props;
  return (
    <Popover
      open={menu.open}
      onOpenChange={(open) => {
        if (!open) menu.onClose();
      }}
    >
      <PopoverPopup
        anchor={() => {
          const element = props.anchor.current;
          if (!element) return null;
          const selection = element.ownerDocument.getSelection();
          const range = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
          if (!range || !element.contains(range.commonAncestorContainer)) return element;
          range.collapse(false);
          return {
            contextElement: element,
            getBoundingClientRect: () => {
              const rect = range.getBoundingClientRect();
              return rect.height > 0 ? rect : element.getBoundingClientRect();
            },
          };
        }}
        side="bottom"
        align="start"
        padding="none"
        width="md"
        initialFocus={false}
        finalFocus={false}
      >
        <ComposerCommandMenu
          listId={menu.listId}
          items={menu.items}
          resolvedTheme={resolvedTheme}
          isLoading={false}
          triggerKind="path"
          emptyStateText="No matching models."
          activeItemId={menu.activeItemId}
          onHighlightedItemChange={menu.onHighlightedItemChange}
          onSelect={(item) => {
            if (item.type === "model") menu.onSelect(item);
          }}
        />
      </PopoverPopup>
    </Popover>
  );
}
