import {
  ANTIGRAVITY_DEFAULT_MODEL,
  type ProviderInstanceId,
  type EnvironmentId,
  type ProviderDriverKind,
  type ResolvedKeybindingsConfig,
} from "@t3tools/contracts";
import { memo, useRef, useState } from "react";
import { Badge } from "../ui/badge";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { cn, isMacPlatform } from "~/lib/utils";
import { ModelPickerContent, resolveModelPickerSelectedModel } from "./ModelPickerContent";
import { ChatGptSharingControl } from "./ChatGptSharingControl";
import { ProviderInstanceIcon } from "./ProviderInstanceIcon";
import { providerIconOpacity } from "./providerIconOpacity";
import { ModelEsque, getDisplayModelName, getTriggerDisplayModelName } from "./providerIconUtils";
import { shouldShowInstanceBadge, type ProviderInstanceEntry } from "../../providerInstances";
import { ComposerControl, type ComposerControlSize } from "./ComposerControl";
import { useComposerMenuProps } from "./composerEventScope";
import { shortcutLabelForCommand } from "../../keybindings";

/** Holds the page still behind the open picker; its lifetime is the popup element's. */
function lockBackgroundScroll(popup: HTMLElement | null) {
  if (!popup) return;
  const { documentElement, body } = document;
  const previousDocumentOverscrollBehavior = documentElement.style.overscrollBehavior;
  const previousBodyOverflow = body.style.overflow;
  const previousBodyPaddingRight = body.style.paddingRight;
  const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

  documentElement.style.overscrollBehavior = "contain";
  body.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }

  const shouldAllowOverlayScroll = (target: EventTarget | null) => {
    return target instanceof Element && target.closest("[data-model-picker-content]");
  };
  const preventBackgroundWheel = (event: WheelEvent) => {
    if (shouldAllowOverlayScroll(event.target)) {
      return;
    }
    event.preventDefault();
  };
  const preventBackgroundTouchMove = (event: TouchEvent) => {
    if (shouldAllowOverlayScroll(event.target)) {
      return;
    }
    event.preventDefault();
  };

  document.addEventListener("wheel", preventBackgroundWheel, { capture: true, passive: false });
  document.addEventListener("touchmove", preventBackgroundTouchMove, {
    capture: true,
    passive: false,
  });

  return () => {
    document.removeEventListener("wheel", preventBackgroundWheel, { capture: true });
    document.removeEventListener("touchmove", preventBackgroundTouchMove, { capture: true });
    documentElement.style.overscrollBehavior = previousDocumentOverscrollBehavior;
    body.style.overflow = previousBodyOverflow;
    body.style.paddingRight = previousBodyPaddingRight;
  };
}

function metaKeyLabel(): string {
  return typeof navigator !== "undefined" && isMacPlatform(navigator.platform) ? "\u2318" : "Ctrl";
}

export const ProviderModelPicker = memo(function ProviderModelPicker(props: {
  environmentId: EnvironmentId | null;
  activeInstanceId: ProviderInstanceId;
  model: string;
  selectedModels?: ReadonlyArray<{ instanceId: ProviderInstanceId; model: string }>;
  onToggleModel?: (instanceId: ProviderInstanceId, model: string) => void;
  lockedProvider: ProviderDriverKind | null;
  lockedContinuationGroupKey?: string | null;
  instanceEntries: ReadonlyArray<ProviderInstanceEntry>;
  keybindings?: ResolvedKeybindingsConfig;
  modelOptionsByInstance: ReadonlyMap<ProviderInstanceId, ReadonlyArray<ModelEsque>>;
  providerToggle?: {
    entries: ReadonlyArray<ProviderInstanceEntry>;
    onToggle: (options?: { focusComposer: boolean }) => void;
  };
  activeProviderIconClassName?: string;
  instanceIndicatorBackground?: string;
  size?: ComposerControlSize;
  compact?: boolean;
  isComposerOwned?: boolean;
  disabled?: boolean;
  terminalOpen?: boolean;
  open?: boolean;
  triggerClassName?: string;
  triggerLabel?: string;
  triggerAriaLabel?: string;
  onOpenChange?: (open: boolean) => void;
  onOpenProviderSetup?: (instanceId: ProviderInstanceId) => void;
  getModelDisabledReason?: (instanceId: ProviderInstanceId, model: string) => string | null;
  onInstanceModelChange: (instanceId: ProviderInstanceId, model: string) => void;
}) {
  const composerFloatingLayerProps = useComposerMenuProps();
  const [uncontrolledIsMenuOpen, setUncontrolledIsMenuOpen] = useState(false);
  const isMenuOpen = props.open ?? uncontrolledIsMenuOpen;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const size = props.size ?? "sm";

  const activeEntry =
    props.instanceEntries.find((entry) => entry.instanceId === props.activeInstanceId) ?? null;

  const activeInstanceId = props.activeInstanceId;
  const selectedInstanceOptions = props.modelOptionsByInstance.get(activeInstanceId) ?? [];
  const selectedModel =
    resolveModelPickerSelectedModel({
      driverKind: activeEntry?.driverKind,
      model: props.model,
      options: selectedInstanceOptions,
    }) ??
    (activeEntry?.driverKind === "opencode" || activeEntry?.driverKind === "antigravity"
      ? undefined
      : selectedInstanceOptions[0]);
  const triggerTitle = selectedModel
    ? getTriggerDisplayModelName(selectedModel, activeEntry?.driverKind)
    : props.model === ANTIGRAVITY_DEFAULT_MODEL
      ? "Choose model"
      : props.model || "Choose model";
  const triggerLabel = selectedModel
    ? `${getDisplayModelName(selectedModel)}${selectedModel.isUnavailable ? " (Unavailable)" : ""}`
    : triggerTitle;
  const showInstanceBadge =
    activeEntry !== null && shouldShowInstanceBadge(activeEntry, props.instanceEntries);

  const setIsMenuOpen = (open: boolean) => {
    props.onOpenChange?.(open);
    if (props.open === undefined) {
      setUncontrolledIsMenuOpen(open);
    }
  };

  const handleInstanceModelChange = (instanceId: ProviderInstanceId, model: string) => {
    if (props.disabled) return;
    props.onInstanceModelChange(instanceId, model);
    setIsMenuOpen(false);
  };

  const shortcutLabel = props.keybindings
    ? shortcutLabelForCommand(props.keybindings, "modelPicker.toggle")
    : null;
  const selectedEntries = props.selectedModels?.map((selection) => {
    const entry = props.instanceEntries.find(
      (candidate) => candidate.instanceId === selection.instanceId,
    );
    const model = resolveModelPickerSelectedModel({
      driverKind: entry?.driverKind,
      model: selection.model,
      options: props.modelOptionsByInstance.get(selection.instanceId) ?? [],
    });
    const unavailable = model?.isUnavailable ? " (Unavailable)" : "";
    return {
      ...selection,
      entry,
      label: model
        ? `${getTriggerDisplayModelName(model, entry?.driverKind)}${unavailable}`
        : selection.model,
      fullLabel: model ? `${getDisplayModelName(model)}${unavailable}` : selection.model,
    };
  });
  const multipleLabel = selectedEntries
    ? selectedEntries.length === 0
      ? "Choose models"
      : `${selectedEntries
          .slice(0, 2)
          .map((selection) => selection.label)
          .join(", ")}${selectedEntries.length > 2 ? `, ${selectedEntries.length - 2} more` : ""}`
    : undefined;
  const allModelNames = selectedEntries
    ? selectedEntries.map((selection) => selection.fullLabel).join(", ") || "Choose models"
    : undefined;
  const triggerTooltipContent = shortcutLabel
    ? `${props.triggerLabel ?? allModelNames ?? triggerLabel} · ${shortcutLabel}`
    : (props.triggerLabel ?? allModelNames ?? triggerLabel);

  const providerToggle = props.providerToggle ?? null;
  const canToggle = (providerToggle?.entries.length ?? 0) > 1;
  const showBothIcons = canToggle;
  const toggleTargetEntry =
    providerToggle?.entries.find((entry) => entry.instanceId !== activeInstanceId) ?? null;
  // A provider switch leaves the full picker closed.
  const suppressOpenRef = useRef(false);
  const toggleTooltipContent = toggleTargetEntry
    ? `Switch to ${toggleTargetEntry.displayName} · ${metaKeyLabel()}-click for all models`
    : (props.triggerLabel ?? triggerLabel);

  return (
    <Popover
      open={isMenuOpen}
      onOpenChange={(open) => {
        if (props.disabled) {
          setIsMenuOpen(false);
          return;
        }
        if (open && suppressOpenRef.current) {
          suppressOpenRef.current = false;
          providerToggle?.onToggle();
          return;
        }
        suppressOpenRef.current = false;
        setIsMenuOpen(open);
      }}
    >
      <PopoverTrigger
        render={
          <ComposerControl
            aria-label={
              providerToggle
                ? toggleTargetEntry
                  ? `Switch to ${toggleTargetEntry.displayName}`
                  : (props.triggerLabel ?? triggerLabel)
                : (props.triggerAriaLabel ?? props.triggerLabel ?? allModelNames ?? triggerLabel)
            }
            size={size}
            data-chat-provider-model-picker="true"
            className={cn(
              "min-w-0 shrink justify-between whitespace-nowrap",
              props.compact
                ? "max-w-42 shrink-0"
                : !props.isComposerOwned && "max-w-48 sm:max-w-56",
              props.triggerClassName,
            )}
            disabled={props.disabled}
            onClick={(event) => {
              suppressOpenRef.current = canToggle && !event.metaKey && !event.ctrlKey;
            }}
          />
        }
      >
        {providerToggle ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  className={cn(
                    "relative inline-flex h-4 items-center",
                    showBothIcons ? "w-8" : "w-4",
                  )}
                />
              }
              data-chat-provider-model-picker-toggle="true"
            >
              {providerToggle.entries.map((entry) => {
                const isActive = entry.instanceId === activeInstanceId;
                return (
                  <ProviderInstanceIcon
                    key={entry.instanceId}
                    driverKind={entry.driverKind}
                    displayName={entry.displayName}
                    accentColor={entry.accentColor}
                    opacity={providerIconOpacity(
                      entry.driverKind,
                      showBothIcons ? (isActive ? "active" : "inactive") : "default",
                    )}
                    className={cn(
                      "size-4",
                      showBothIcons &&
                        "absolute bottom-0 left-0 origin-bottom-left transition-[translate,scale,opacity] duration-250 ease-out motion-reduce:transition-none",
                      showBothIcons &&
                        (isActive ? "z-10 translate-x-4 scale-100" : "translate-x-0 scale-75"),
                    )}
                    iconClassName={cn("size-4", props.activeProviderIconClassName)}
                    indicatorBackground={
                      props.instanceIndicatorBackground ?? "var(--contrast-input)"
                    }
                  />
                );
              })}
            </TooltipTrigger>
            <TooltipPopup side="top">{toggleTooltipContent}</TooltipPopup>
          </Tooltip>
        ) : (
          <span
            className={cn("flex min-w-0 flex-1 items-center", size === "xs" ? "gap-1" : "gap-1.5")}
          >
            {selectedEntries && props.triggerLabel === undefined ? (
              <span
                data-chat-provider-model-picker-icon
                className="flex shrink-0 items-center -space-x-1"
                aria-hidden="true"
              >
                {selectedEntries
                  .slice(0, 3)
                  .map((selection) =>
                    selection.entry ? (
                      <ProviderInstanceIcon
                        key={`${selection.instanceId}:${selection.model}`}
                        driverKind={selection.entry.driverKind}
                        displayName={selection.entry.displayName}
                        accentColor={selection.entry.accentColor}
                        className="size-4 rounded-full bg-(--chat-composer-glass-surface,var(--background)) ring-2 ring-(--chat-composer-glass-surface,var(--background))"
                        iconClassName="size-4"
                        iconOpacity={providerIconOpacity(selection.entry.driverKind, "active")}
                      />
                    ) : null,
                  )}
                {selectedEntries.length > 3 ? (
                  <span className="relative z-30 flex size-4 items-center justify-center rounded-full bg-(--chat-composer-glass-surface,var(--background)) text-3xs ring-2 ring-(--chat-composer-glass-surface,var(--background))">
                    +{selectedEntries.length - 3}
                  </span>
                ) : null}
              </span>
            ) : activeEntry && props.triggerLabel === undefined ? (
              // Narrow compacted composers hide the provider icon before truncating the name.
              <span data-chat-provider-model-picker-icon className="contents">
                <ProviderInstanceIcon
                  driverKind={activeEntry.driverKind}
                  displayName={activeEntry.displayName}
                  accentColor={activeEntry.accentColor}
                  acpRegistryAgentId={activeEntry.acpRegistryAgentId}
                  acpRegistryIconUrl={activeEntry.acpRegistryIconUrl}
                  showBadge={showInstanceBadge}
                  opacity={providerIconOpacity(
                    activeEntry.driverKind,
                    props.lockedProvider !== null ? "default" : "active",
                  )}
                  className="size-4"
                  iconClassName={cn("size-4", props.activeProviderIconClassName)}
                  indicatorBackground={props.instanceIndicatorBackground ?? "var(--contrast-input)"}
                  badgeClassName={cn(
                    "right-[-0.125rem] bottom-[-0.125rem] h-3 min-w-3 px-0.5 text-5xs",
                    size === "xs" && "shadow-none",
                  )}
                />
              </span>
            ) : null}
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    className="min-w-0 flex-1 overflow-hidden truncate"
                    data-chat-provider-model-picker-label="true"
                  />
                }
              >
                {props.triggerLabel ?? multipleLabel ?? triggerTitle}
              </TooltipTrigger>
              <TooltipPopup side="top">{triggerTooltipContent}</TooltipPopup>
            </Tooltip>
            {selectedModel?.isUnavailable &&
            !selectedEntries &&
            props.triggerLabel === undefined ? (
              <Badge variant="outline" size="sm">
                Unavailable
              </Badge>
            ) : null}
          </span>
        )}
      </PopoverTrigger>
      <PopoverPopup
        {...(props.isComposerOwned ? composerFloatingLayerProps : {})}
        ref={lockBackgroundScroll}
        initialFocus={searchInputRef}
        align="start"
        className="before:hidden"
        padding="none"
        touchBackdrop
      >
        <ModelPickerContent
          searchInputRef={searchInputRef}
          environmentId={props.environmentId}
          activeInstanceId={activeInstanceId}
          model={props.model}
          {...(props.selectedModels !== undefined ? { selectedModels: props.selectedModels } : {})}
          {...(props.onToggleModel
            ? {
                onToggleModel: (instanceId: ProviderInstanceId, model: string) => {
                  if (!props.disabled) props.onToggleModel?.(instanceId, model);
                },
              }
            : {})}
          lockedProvider={props.lockedProvider}
          lockedContinuationGroupKey={props.lockedContinuationGroupKey ?? null}
          instanceEntries={props.instanceEntries}
          {...(props.keybindings ? { keybindings: props.keybindings } : {})}
          modelOptionsByInstance={props.modelOptionsByInstance}
          terminalOpen={props.terminalOpen ?? false}
          onRequestClose={() => setIsMenuOpen(false)}
          {...(props.onOpenProviderSetup ? { onOpenProviderSetup: props.onOpenProviderSetup } : {})}
          getModelDisabledReason={(instanceId, model) =>
            props.disabled
              ? "Model picker is disabled"
              : (props.getModelDisabledReason?.(instanceId, model) ?? null)
          }
          onInstanceModelChange={handleInstanceModelChange}
        />
        {props.selectedModels === undefined ? (
          <ChatGptSharingControl provider={activeEntry?.snapshot ?? null} />
        ) : null}
      </PopoverPopup>
    </Popover>
  );
});
