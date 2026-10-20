import { describe, expect, it } from "vite-plus/test";

import {
  resolveComposerMenuActiveItemId,
  stepComposerMenuHighlight,
} from "./composerMenuHighlight";

describe("stepComposerMenuHighlight", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
  it.each([
    [null, "ArrowDown", "a"],
    [null, "ArrowUp", "c"],
    ["b", "ArrowDown", "c"],
    ["c", "ArrowDown", "a"],
    ["a", "ArrowUp", "c"],
    ["gone", "ArrowDown", "a"],
  ] as const)("from %s, %s highlights %s", (highlighted, key, expected) => {
    expect(stepComposerMenuHighlight(items, highlighted, key)?.id).toBe(expected);
  });
});

describe("resolveComposerMenuActiveItemId", () => {
  it("clears the active result while async results are empty and resolves against restored results", () => {
    const search = {
      highlightedItemId: "second",
      currentSearchKey: "path:src",
      highlightedSearchKey: "path:src",
    };
    const cleared = resolveComposerMenuActiveItemId({ ...search, items: [] });
    expect(cleared).toBeNull();
    expect(
      resolveComposerMenuActiveItemId({
        ...search,
        highlightedItemId: cleared,
        items: [{ id: "new-result" }, { id: "second" }],
      }),
    ).toBe("new-result");
  });
});
