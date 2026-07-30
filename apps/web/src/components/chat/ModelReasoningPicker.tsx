import type {
  ProviderDriverKind,
  ProviderOptionDescriptor,
  ProviderOptionSelection,
  ServerProviderModel,
} from "@t3tools/contracts";
import type { EffortDisplay } from "@t3tools/contracts/settings";
import {
  getProviderOptionCurrentLabel,
  getProviderOptionCurrentValue,
  getProviderOptionDescriptors,
} from "@t3tools/shared/model";
import { ChevronDownIcon, ZapIcon } from "lucide-react";
import { memo, useRef, useState, type ComponentProps, type ReactNode } from "react";

import { getProviderModelCapabilities } from "../../providerModels";
import { Menu, MenuPopup, MenuTrigger } from "../ui/menu";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";
import { ComposerControl, type ComposerControlSize } from "./ComposerControl";
import { composerFloatingLayerProps, focusRequestedPermission } from "./composerEventScope";
import { ComposerPermissionsSection } from "./ComposerFooterControls";
import { EffortGlyph, resolveEffortGlyph } from "./EffortGlyph";
import type { ModelReasoningGridSpec } from "./ModelReasoningGrid";
import { ModelReasoningModal, getFastModeControl } from "./ModelReasoningModal";
import type { PromptUltrathink } from "./TraitsPicker";

type ProviderOptions = ReadonlyArray<ProviderOptionSelection>;

const MODEL_REASONING_LEVEL_IDS = new Set(["low", "medium", "high", "xhigh"]);

/** The grid already owns reasoning levels and the descriptors hidden here, so "More options" skips them. */
export function shouldShowModelReasoningMoreOption(
  descriptorId: string,
  optionId: string,
): boolean {
  return !(
    (descriptorId === "effort" || descriptorId === "reasoningEffort") &&
    MODEL_REASONING_LEVEL_IDS.has(optionId)
  );
}

export function modelReasoningMoreHiddenDescriptorIds(provider: ProviderDriverKind) {
  return provider === "claudeAgent" ? ["contextWindow"] : ["serviceTier", "fastMode"];
}

export function buildModelReasoningTriggerDisplay(input: {
  spec: ModelReasoningGridSpec;
  model: string;
  descriptors: ReadonlyArray<ProviderOptionDescriptor>;
  effortDisplay?: EffortDisplay;
  promptUltrathink?: PromptUltrathink;
}) {
  const reasoningDescriptor = input.descriptors.find(
    (descriptor) =>
      descriptor.type === "select" &&
      (descriptor.id === "reasoningEffort" || descriptor.id === "effort"),
  );
  const promptControlsReasoning = (input.promptUltrathink ?? "none") !== "none";
  const reasoningValue = getProviderOptionCurrentValue(reasoningDescriptor);
  const glyph =
    input.effortDisplay === "bars" &&
    !promptControlsReasoning &&
    reasoningDescriptor?.type === "select" &&
    typeof reasoningValue === "string"
      ? resolveEffortGlyph(reasoningDescriptor, reasoningValue)
      : null;
  return {
    modelLabel: input.spec.rows.find((row) => row.model === input.model)?.label ?? input.model,
    reasoningLabel: promptControlsReasoning
      ? "Ultrathink"
      : reasoningDescriptor?.type === "select"
        ? (getProviderOptionCurrentLabel(reasoningDescriptor) ?? reasoningDescriptor.label)
        : "Reasoning",
    reasoningGlyph: glyph?.special === null ? glyph : null,
    showFastModeIcon: getFastModeControl(input.descriptors)?.enabled ?? false,
  };
}

export const ModelReasoningPicker = memo(function ModelReasoningPicker(props: {
  size?: ComposerControlSize;
  disabled?: boolean;
  traitsMenuContent?: ReactNode;
  permissions?: ComponentProps<typeof ComposerPermissionsSection>;
  permissionsOwnsShortcut?: boolean;
  promptUltrathink?: PromptUltrathink;
  effortDisplay?: EffortDisplay;
  spec: ModelReasoningGridSpec;
  provider: ProviderDriverKind;
  models: ReadonlyArray<ServerProviderModel>;
  model: string;
  modelOptions: ProviderOptions | null | undefined;
  getModelDisabledReason?: (model: string) => string | null;
  onModelOptionsChange: (options: ProviderOptions | undefined) => void;
  onModelChange: (model: string, options: ProviderOptions | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const descriptors = getProviderOptionDescriptors({
    caps: getProviderModelCapabilities(props.models, props.model, props.provider),
    selections: props.modelOptions,
  });
  const { modelLabel, reasoningLabel, reasoningGlyph, showFastModeIcon } =
    buildModelReasoningTriggerDisplay({
      spec: props.spec,
      model: props.model,
      descriptors,
      effortDisplay: props.effortDisplay ?? "label",
      promptUltrathink:
        props.provider === "claudeAgent" ? (props.promptUltrathink ?? "none") : "none",
    });

  return (
    <Popover
      open={open}
      onOpenChangeComplete={(isOpen) => focusRequestedPermission(isOpen, triggerRef.current)}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setShowMoreOptions(false);
        }
      }}
    >
      <PopoverTrigger
        render={
          <ComposerControl
            ref={triggerRef}
            size={props.size ?? "sm"}
            disabled={props.disabled}
            aria-label={`Choose model and reasoning: ${modelLabel}, ${reasoningLabel}${showFastModeIcon ? ", fast mode on" : ""}`}
            className="group/model-reasoning min-w-0 shrink-0 justify-start whitespace-nowrap hover:bg-transparent data-popup-open:bg-transparent data-popup-open:text-foreground"
            data-composer-shortcut={
              props.permissions && props.permissionsOwnsShortcut !== false
                ? "composer.effort composer.mode"
                : "composer.effort"
            }
            data-codex-model-reasoning-picker-trigger
            title={`${modelLabel} ${reasoningLabel}${showFastModeIcon ? " · Fast" : ""}`}
            onClick={(event) => setShowMoreOptions(event.ctrlKey || event.metaKey)}
          />
        }
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span>
            {modelLabel}
            {reasoningGlyph ? null : (
              <>
                {" "}
                <span className="text-muted-foreground group-hover/model-reasoning:text-foreground group-data-popup-open/model-reasoning:text-foreground">
                  {reasoningLabel}
                </span>
              </>
            )}
          </span>
          {reasoningGlyph ? (
            <EffortGlyph
              count={reasoningGlyph.count}
              filled={reasoningGlyph.filled}
              size={props.size ?? "sm"}
            />
          ) : null}
          {showFastModeIcon ? (
            <>
              <ZapIcon
                aria-hidden="true"
                className="size-3.5 shrink-0 fill-current text-white opacity-100"
                fill="currentColor"
                stroke="currentColor"
              />
              <span className="sr-only">Fast mode on</span>
            </>
          ) : null}
        </span>
      </PopoverTrigger>
      <PopoverPopup
        {...composerFloatingLayerProps}
        align="start"
        className="max-w-[calc(100vw-0.5rem)]"
        padding="none"
      >
        <ModelReasoningModal
          spec={props.spec}
          {...(props.promptUltrathink ? { promptUltrathink: props.promptUltrathink } : {})}
          provider={props.provider}
          models={props.models}
          model={props.model}
          modelOptions={props.modelOptions}
          {...(props.getModelDisabledReason
            ? { getModelDisabledReason: props.getModelDisabledReason }
            : {})}
          onModelOptionsChange={props.onModelOptionsChange}
          onModelChange={props.onModelChange}
          onSelectionComplete={() => setOpen(false)}
        />
        {props.permissions ? (
          <div className="border-t border-border/70 p-1">
            <ComposerPermissionsSection
              {...props.permissions}
              inPopover
              onSelectionComplete={() => setOpen(false)}
            />
          </div>
        ) : null}
        {showMoreOptions && props.traitsMenuContent ? (
          <div className="border-t border-border/70 p-1">
            <Menu>
              <MenuTrigger
                render={<ComposerControl size="sm" className="w-full justify-between" />}
              >
                More options
                <ChevronDownIcon
                  aria-hidden="true"
                  className="size-3.5 text-icon-muted"
                  strokeWidth={2.25}
                />
              </MenuTrigger>
              <MenuPopup {...composerFloatingLayerProps} align="start">
                {props.traitsMenuContent}
              </MenuPopup>
            </Menu>
          </div>
        ) : null}
      </PopoverPopup>
    </Popover>
  );
});
