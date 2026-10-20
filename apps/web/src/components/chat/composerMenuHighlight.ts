export function resolveComposerMenuActiveItemId(input: {
  items: ReadonlyArray<{ id: string }>;
  highlightedItemId: string | null;
  currentSearchKey: string | null;
  highlightedSearchKey: string | null;
}): string | null {
  if (input.items.length === 0) {
    return null;
  }

  if (
    input.currentSearchKey === input.highlightedSearchKey &&
    input.highlightedItemId &&
    input.items.some((item) => item.id === input.highlightedItemId)
  ) {
    return input.highlightedItemId;
  }

  return input.items[0]?.id ?? null;
}

/** The item ArrowDown or ArrowUp moves the highlight to, wrapping at either end. */
export function stepComposerMenuHighlight<Item extends { id: string }>(
  items: ReadonlyArray<Item>,
  highlightedItemId: string | null,
  key: "ArrowDown" | "ArrowUp",
): Item | null {
  if (items.length === 0) return null;
  const highlightedIndex = items.findIndex((item) => item.id === highlightedItemId);
  const normalizedIndex = highlightedIndex >= 0 ? highlightedIndex : key === "ArrowDown" ? -1 : 0;
  const offset = key === "ArrowDown" ? 1 : -1;
  return items[(normalizedIndex + offset + items.length) % items.length] ?? null;
}

/** Keys an open suggestion menu takes: arrows move the highlight, Enter and Tab pick an item. */
export function handleComposerMenuKey<Item>(
  key: string,
  menu: {
    readonly items: ReadonlyArray<Item>;
    readonly activeItem: Item | null;
    readonly nudge: (key: "ArrowDown" | "ArrowUp") => void;
    readonly select: (item: Item) => void;
  },
): boolean {
  if ((key === "ArrowDown" || key === "ArrowUp") && menu.items.length > 0) {
    menu.nudge(key);
    return true;
  }
  const item = menu.activeItem ?? menu.items[0];
  if ((key === "Enter" || key === "Tab") && item) {
    menu.select(item);
    return true;
  }
  return false;
}
