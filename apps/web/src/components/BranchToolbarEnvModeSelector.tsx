import { ComposerSelectControl } from "./chat/ComposerControl";
import { ComposerContextLabel } from "./ComposerContextLabel";
import { FolderGit2Icon, FolderGitIcon, FolderIcon, HistoryIcon } from "lucide-react";
import { memo, type MouseEvent as ReactMouseEvent } from "react";
import { T, useGT, useMessages } from "gt-react";

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
  onOpen?: () => void;
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
  onOpen,
}: BranchToolbarEnvModeSelectorProps) {
  const gt = useGT();
  const m = useMessages();
  const composerFloatingLayerProps = useComposerMenuProps();
  const shortcutLabel = shortcutLabelForCommand(
    useAtomValue(primaryServerKeybindingsAtom),
    "composer.workspace",
  );
  const envModeItems = [
    {
      value: "local",
      label: resolveCurrentWorkspaceLabel(activeWorktreePath, m),
    },
    { value: "worktree", label: resolveEnvModeLabel("worktree", m) },
    ...worktrees.map((worktree) => ({
      value: `${WORKTREE_SELECT_VALUE_PREFIX}${worktree.worktreePath}`,
      label: resolveWorktreeLabel(worktree, m),
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
          "inline-flex h-7 min-w-0 items-center gap-1.5 border border-transparent font-normal text-muted-foreground/70 text-sm sm:h-6 sm:text-xs",
          iconOnly ? "px-0 text-foreground/70 dark:text-muted-foreground" : "px-1.75",
        )}
        aria-label={resolveLockedWorkspaceLabel(activeWorktreePath, effectiveEnvMode, m)}
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
              ? resolveEnvModeLabel("worktree", m)
              : resolveLockedWorkspaceLabel(activeWorktreePath, effectiveEnvMode, m)}
          </ComposerContextLabel>
        ) : null}
      </span>
    );

    return (
      <Tooltip>
        <TooltipTrigger render={lockedRow} />
        <TooltipPopup>
          {forceNewWorktree
            ? gt("Each model starts in its own worktree.")
            : (activeWorktreePath ??
              resolveLockedWorkspaceLabel(activeWorktreePath, effectiveEnvMode, m))}
        </TooltipPopup>
      </Tooltip>
    );
  }

  return (
    <Select
      modal={false}
      value={effectiveEnvMode}
      onOpenChange={(open) => {
        if (open) onOpen?.();
      }}
      onValueChange={(value: string | null) => {
        if (value?.startsWith(WORKTREE_SELECT_VALUE_PREFIX)) {
          const worktree = worktrees.find(
            (candidate) => `${WORKTREE_SELECT_VALUE_PREFIX}${candidate.worktreePath}` === value,
          );
          if (worktree) onUseWorktree(worktree);
          return;
        }
        if (value === "local" || value === "worktree") onEnvModeChange(value);
      }}
      items={envModeItems}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <ComposerSelectControl
              size="xs"
              className="min-w-0 shrink"
              aria-label={gt("Workspace")}
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
            ? resolveEnvModeLabel("worktree", m)
            : resolveCurrentWorkspaceLabel(activeWorktreePath, m)}
          {shortcutLabel ? ` · ${shortcutLabel}` : null}
        </TooltipPopup>
      </Tooltip>
      <SelectPopup
        alignItemWithTrigger={false}
        {...composerFloatingLayerProps}
        className={worktrees.length > 0 ? "w-[min(21rem,calc(100vw-2rem))]" : undefined}
      >
        <SelectGroup>
          <SelectGroupLabel>
            <T>Workspace</T>
          </SelectGroupLabel>
          <SelectItem value="local">
            <span className="inline-flex items-center gap-1.5">
              {activeWorktreePath ? (
                <FolderGitIcon className="size-3" />
              ) : (
                <FolderIcon className="size-3" />
              )}
              {resolveCurrentWorkspaceLabel(activeWorktreePath, m)}
            </span>
          </SelectItem>
          <SelectItem value="worktree">
            <span className="inline-flex items-center gap-1.5">
              <FolderGit2Icon className="size-3" />
              {resolveEnvModeLabel("worktree", m)}
            </span>
          </SelectItem>
          {worktrees.map((worktree) => (
            <SelectItem
              key={worktree.worktreePath}
              value={`${WORKTREE_SELECT_VALUE_PREFIX}${worktree.worktreePath}`}
            >
              <span className="inline-flex items-center gap-1.5">
                <HistoryIcon className="size-3" />
                {resolveWorktreeLabel(worktree, m)}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectPopup>
    </Select>
  );
});
