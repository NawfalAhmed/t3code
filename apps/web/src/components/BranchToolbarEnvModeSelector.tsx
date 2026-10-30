import { ComposerSelectControl } from "./chat/ComposerControl";
import { ComposerContextLabel } from "./ComposerContextLabel";
import { FolderGit2Icon, FolderGitIcon, FolderIcon, HistoryIcon } from "lucide-react";
import { memo, type MouseEvent as ReactMouseEvent } from "react";

import {
  resolveCurrentWorkspaceLabel,
  resolveEnvModeLabel,
  resolveLockedWorkspaceLabel,
  resolveWorktreeLabel,
  type ExistingWorktree,
  type EnvMode,
} from "./BranchToolbar.logic";
import { useComposerMenuProps } from "./chat/composerEventScope";
import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectValue,
} from "./ui/select";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";
import { useAtomValue } from "@effect/atom-react";
import { shortcutLabelForCommand } from "../keybindings";
import { primaryServerKeybindingsAtom } from "../state/server";
import { cn } from "~/lib/utils";

export const WORKTREE_SELECT_VALUE_PREFIX = "worktree:";

interface BranchToolbarEnvModeSelectorProps {
  forceNewWorktree?: boolean;
  iconOnly?: boolean;
  envLocked: boolean;
  effectiveEnvMode: EnvMode;
  activeWorktreePath: string | null;
  onEnvModeChange: (mode: EnvMode) => void;
  worktrees: ReadonlyArray<ExistingWorktree>;
  onUseWorktree: (worktree: ExistingWorktree) => void;
}

export const BranchToolbarEnvModeSelector = memo(function BranchToolbarEnvModeSelector({
  forceNewWorktree = false,
  iconOnly = false,
  envLocked,
  effectiveEnvMode,
  activeWorktreePath,
  onEnvModeChange,
  worktrees,
  onUseWorktree,
}: BranchToolbarEnvModeSelectorProps) {
  const composerFloatingLayerProps = useComposerMenuProps();
  const shortcutLabel = shortcutLabelForCommand(
    useAtomValue(primaryServerKeybindingsAtom),
    "composer.workspace",
  );
  const envModeItems = [
    {
      value: "local",
      label: resolveCurrentWorkspaceLabel(activeWorktreePath),
    },
    { value: "worktree", label: resolveEnvModeLabel("worktree") },
    ...worktrees.map((worktree) => ({
      value: `${WORKTREE_SELECT_VALUE_PREFIX}${worktree.worktreePath}`,
      label: resolveWorktreeLabel(worktree),
    })),
  ];

  const stopContextMenuMouseDown = (event: ReactMouseEvent) => {
    if (event.button !== 0 || event.ctrlKey) {
      event.stopPropagation();
    }
  };

  if (envLocked || forceNewWorktree) {
    const lockedRow = (
      <span
        className={cn(
          "inline-flex h-7 min-w-0 items-center gap-1 border border-transparent font-normal text-muted-foreground/70 text-xs sm:h-6",
          iconOnly ? "px-0 text-foreground/70 dark:text-muted-foreground" : "px-1.75",
        )}
        aria-label={resolveLockedWorkspaceLabel(activeWorktreePath, effectiveEnvMode)}
        data-composer-context-control
      >
        {activeWorktreePath ? (
          <FolderGitIcon className="size-3" />
        ) : effectiveEnvMode === "worktree" ? (
          <FolderGit2Icon className="size-3" />
        ) : (
          <FolderIcon className="size-3" />
        )}
        {!iconOnly ? (
          <ComposerContextLabel>
            {forceNewWorktree
              ? resolveEnvModeLabel("worktree")
              : resolveLockedWorkspaceLabel(activeWorktreePath, effectiveEnvMode)}
          </ComposerContextLabel>
        ) : null}
      </span>
    );

    return (
      <Tooltip>
        <TooltipTrigger render={lockedRow} />
        <TooltipPopup>
          {forceNewWorktree
            ? "Each model starts in its own worktree."
            : resolveLockedWorkspaceLabel(activeWorktreePath, effectiveEnvMode)}
        </TooltipPopup>
      </Tooltip>
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
      <Tooltip>
        <TooltipTrigger
          render={
            <ComposerSelectControl
              size="xs"
              className="min-w-0 shrink"
              aria-label="Workspace"
              data-composer-shortcut="composer.workspace"
              data-composer-context-control
              onMouseDownCapture={stopContextMenuMouseDown}
            />
          }
        >
          {effectiveEnvMode === "worktree" ? (
            <FolderGit2Icon className="size-3" />
          ) : activeWorktreePath ? (
            <FolderGitIcon className="size-3" />
          ) : (
            <FolderIcon className="size-3" />
          )}
          <ComposerContextLabel>
            <SelectValue />
          </ComposerContextLabel>
        </TooltipTrigger>
        <TooltipPopup>
          {effectiveEnvMode === "worktree"
            ? resolveEnvModeLabel("worktree")
            : resolveCurrentWorkspaceLabel(activeWorktreePath)}
          {shortcutLabel ? ` · ${shortcutLabel}` : null}
        </TooltipPopup>
      </Tooltip>
      <SelectPopup
        alignItemWithTrigger={false}
        {...composerFloatingLayerProps}
        className={worktrees.length > 0 ? "w-[min(21rem,calc(100vw-2rem))]" : undefined}
      >
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
