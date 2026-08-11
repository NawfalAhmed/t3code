import { FolderGit2Icon, FolderGitIcon, FolderIcon, HistoryIcon } from "lucide-react";
import { memo, useMemo } from "react";

import {
  resolveCurrentWorkspaceLabel,
  resolveEnvModeLabel,
  resolveLockedWorkspaceLabel,
  resolveWorktreeLabel,
  type ExistingWorktree,
  type EnvMode,
} from "./BranchToolbar.logic";
import { composerFloatingLayerProps } from "./chat/composerEventScope";
import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export const WORKTREE_SELECT_VALUE_PREFIX = "worktree:";

interface BranchToolbarEnvModeSelectorProps {
  envLocked: boolean;
  effectiveEnvMode: EnvMode;
  activeWorktreePath: string | null;
  onEnvModeChange: (mode: EnvMode) => void;
  worktrees: ReadonlyArray<ExistingWorktree>;
  onUseWorktree: (worktree: ExistingWorktree) => void;
}

export const BranchToolbarEnvModeSelector = memo(function BranchToolbarEnvModeSelector({
  envLocked,
  effectiveEnvMode,
  activeWorktreePath,
  onEnvModeChange,
  worktrees,
  onUseWorktree,
}: BranchToolbarEnvModeSelectorProps) {
  const envModeItems = useMemo(
    () => [
      { value: "local", label: resolveCurrentWorkspaceLabel(activeWorktreePath) },
      { value: "worktree", label: resolveEnvModeLabel("worktree") },
      ...worktrees.map((worktree) => ({
        value: `${WORKTREE_SELECT_VALUE_PREFIX}${worktree.worktreePath}`,
        label: resolveWorktreeLabel(worktree),
      })),
    ],
    [activeWorktreePath, worktrees],
  );

  if (envLocked) {
    return (
      <span
        className="inline-flex h-7 min-w-0 items-center gap-1 border border-transparent px-[calc(--spacing(2)-1px)] font-normal text-muted-foreground/70 text-xs sm:h-6"
        data-composer-context-control
      >
        {activeWorktreePath ? (
          <FolderGitIcon className="size-3 shrink-0" />
        ) : (
          <FolderIcon className="size-3 shrink-0" />
        )}
        <span
          data-composer-label
          className="min-w-0 max-w-[240px] group-data-[compact]/composer-context:max-w-0"
        >
          <span
            data-composer-label-motion
            className="block w-full min-w-0 max-w-[240px] truncate transition-opacity duration-180 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-[compact]/composer-context:opacity-0 motion-reduce:transition-none"
          >
            {resolveLockedWorkspaceLabel(activeWorktreePath)}
          </span>
        </span>
      </span>
    );
  }

  return (
    <Select
      modal={false}
      value={effectiveEnvMode}
      onValueChange={(value: string | null) => {
        if (value?.startsWith(WORKTREE_SELECT_VALUE_PREFIX)) {
          const worktree = worktrees.find(
            (candidate) => `${WORKTREE_SELECT_VALUE_PREFIX}${candidate.worktreePath}` === value,
          );
          if (worktree) onUseWorktree(worktree);
          return;
        }
        onEnvModeChange(value as EnvMode);
      }}
      items={envModeItems}
    >
      <SelectTrigger
        variant="ghost"
        size="xs"
        className="min-w-0 shrink font-normal text-xs!"
        aria-label="Workspace"
        data-composer-context-control
      >
        {effectiveEnvMode === "worktree" ? (
          <FolderGit2Icon className="size-3" />
        ) : activeWorktreePath ? (
          <FolderGitIcon className="size-3" />
        ) : (
          <FolderIcon className="size-3" />
        )}
        <span
          data-composer-label
          className="min-w-0 max-w-[240px] group-data-[compact]/composer-context:max-w-0"
        >
          <span
            data-composer-label-motion
            className="block w-full min-w-0 max-w-[240px] truncate transition-opacity duration-180 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-[compact]/composer-context:opacity-0 motion-reduce:transition-none"
          >
            <SelectValue />
          </span>
        </span>
      </SelectTrigger>
      <SelectPopup alignItemWithTrigger={false} {...composerFloatingLayerProps}>
        <SelectGroup>
          <SelectGroupLabel>Workspace</SelectGroupLabel>
          <SelectItem value="local">
            <span className="inline-flex items-center gap-1.5">
              {activeWorktreePath ? (
                <FolderGitIcon className="size-3" />
              ) : (
                <FolderIcon className="size-3" />
              )}
              {resolveCurrentWorkspaceLabel(activeWorktreePath)}
            </span>
          </SelectItem>
          <SelectItem value="worktree">
            <span className="inline-flex items-center gap-1.5">
              <FolderGit2Icon className="size-3" />
              {resolveEnvModeLabel("worktree")}
            </span>
          </SelectItem>
          {worktrees.map((worktree) => (
            <SelectItem
              key={worktree.worktreePath}
              value={`${WORKTREE_SELECT_VALUE_PREFIX}${worktree.worktreePath}`}
            >
              <span className="inline-flex items-center gap-1.5">
                <HistoryIcon className="size-3" />
                {resolveWorktreeLabel(worktree)}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectPopup>
    </Select>
  );
});
