# Upstream sync 13-11

Rebased onto upstream `10fbff5ab` (from merge-base `4947db07d`).

## Model and reasoning grid vs. re-picking the shown model

Upstream (#24872) made `onProviderModelSelect` return early when the picked
model is already the shown one, so a re-pick keeps its options. Our grid
passes explicit reasoning options with the pick, so the early return is
skipped when `modelOptions` is given. Otherwise picking a new reasoning level
for the current model would do nothing.

## Citation comment box in the composer

Upstream (#32682) changed the composer citation chip's comment box so Cancel
removes a citation that arrives during dictation. Our quote-card commit
removes that comment box, so we keep our node view and drop upstream's
`ComposerPromptEditorTiptap.citationDraft.browser.test.tsx`. With no comment
box, a citation that arrives during dictation just stays in the draft. The
other dictation fixes in that PR, outside the node view, are kept.
