# Upstream sync onto 6577c6b61 (6 Nov)

Personal commits moved from `337c5858c` to `6577c6b61` (`perf(server): background service launcher uses 75% less memory`). Upstream didn't ship any of our features or fixes, so no commit was dropped. These are the places where upstream changed something one of our commits depends on, and what we kept.

## Ultracode is a toggle, not an effort level

Upstream `2d0efd358` made Ultracode a boolean option that works with any effort. The model picker footer shows it as a toggle, and the trigger shows a workflow icon while it's on. Our gauge commit keeps upstream's comment and footer and still adds `ultra` to the named levels, so Codex Ultra stays off the bar and gauge scale.

Our reasoning grid picker (composer controls commit) keeps Ultracode in the Ctrl/Cmd-click "More options" menu, not in the grid. Its trigger now shows upstream's workflow icon while Ultracode is on.

## Scheduled task destinations

Upstream `4aab23cd7` and `4a087861d` added thread modes: a new thread each run, one thread that continues, or one thread with a fresh session each run. The editor gets a Destination picker, and rows link to their thread. Our composer-style dialog had shown Destination only for a task already bound to a thread. The picker is useful before a thread exists, so Destination now always shows (upstream's component, unchanged) between the name row and the prompt. Our strip hides the permissions control only while a run will go to the bound thread: there's a thread and the mode isn't "New thread each run". In that case the run uses the thread's own settings.

## Dictation in citation comments

Upstream `a9a1b8c4b` added dictation to the citation comment popover. Our citation commit removes that popover and puts the comment field inside the quote block. To keep the behavior, the inline field now uses `useTextFieldSpeech`. Its mic shows while the field has focus or a recording is active. Escape cancels a recording before it leaves the field, and Enter and Cmd/Ctrl+Enter wait for dictation to finish before they save or send. `docs/user/voice-input.md` already says dictation works in citation comments.

## Composer context strip in ChatView

Upstream restructured the composer block (a short window pins the draft composer to the bottom, plus Pi extension status and the usage-limit notice). Our strip changes were applied again on top of that: a full-width background down to the bottom inset, permissions on every thread, and a strip that shows without a git repo or a second machine. Upstream's `[@media(max-height:34rem)]:items-end` pin stays.
