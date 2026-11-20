# Upstream sync, 20 November 2026

Rebased the personal commits from `25854935ba` onto `df09ced768`, the first parent of the
synced fork's main branch.

- Dropped the personal sidebar search context-menu fix. Upstream #31545 already opens thread
  actions from search results, including results in collapsed shelves.
- Kept the scheduled-task composer layout and moved upstream's automatic project default into
  its branch picker. Switching machines clears the selected base so the new project's default can
  load. Saving also retains upstream's explicit thread-unbind flag for a previously linked task.
- Used upstream's model picker readiness check for the Codex/Claude toggle. Models retained after
  a temporary provider check failure remain available for a quick switch.
- Kept the desktop machine name control alongside the upstream preview-tunnel setting. Each row
  displays the selected environment's managed policy lock.
- Kept the Watching shelf as a view of existing GitHub PR watches. Upstream's wake after remaining
  checks finish following a failure still starts a turn, and the shelf resumes between passive
  turns.
