import type {
  ProviderDriverKind,
  ProviderOptionDescriptor,
  ProviderOptionSelection,
  ServerProviderModel,
} from "@t3tools/contracts";
import {
  getProviderOptionCurrentLabel,
  getProviderOptionDescriptors,
  isClaudeUltrathinkPrompt,
} from "@t3tools/shared/model";
import { ZapIcon } from "lucide-react";
import { memo, useState, type ReactNode } from "react";

import { getProviderModelCapabilities } from "../../providerModels";
import { Menu, MenuPopup, MenuTrigger } from "../ui/menu";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";
import {
  ComposerControl,
  ComposerControlChevron,
  type ComposerControlSize,
} from "./ComposerControl";
import { composerFloatingLayerProps } from "./composerEventScope";
import type { ModelReasoningGridSpec } from "./ModelReasoningGrid";
import { ModelReasoningModal, getFastModeControl } from "./ModelReasoningModal";

type ProviderOptions = ReadonlyArray<ProviderOptionSelection>;

export function buildModelReasoningTriggerDisplay(input: {
  spec: ModelReasoningGridSpec;
  model: string;
  descriptors: ReadonlyArray<ProviderOptionDescriptor>;
}) {
  const reasoningDescriptor = input.descriptors.find(
    (descriptor) =>
      descriptor.type === "select" &&
      (descriptor.id === "reasoningEffort" || descriptor.id === "effort"),
  );
  return {
    modelLabel: input.spec.rows.find((row) => row.model === input.model)?.label ?? input.model,
    reasoningLabel:
      reasoningDescriptor?.type === "select"
        ? (getProviderOptionCurrentLabel(reasoningDescriptor) ?? reasoningDescriptor.label)
        : "Reasoning",
    showFastModeIcon: getFastModeControl(input.descriptors)?.enabled ?? false,
  };
}

export const ModelReasoningPicker = memo(function ModelReasoningPicker(props: {
  size?: ComposerControlSize;
  traitsMenuContent?: ReactNode;
  prompt?: string;
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
  const descriptors = getProviderOptionDescriptors({
    caps: getProviderModelCapabilities(props.models, props.model, props.provider),
    selections: props.modelOptions,
  });
  const {
    modelLabel,
    reasoningLabel: optionReasoningLabel,
    showFastModeIcon,
  } = buildModelReasoningTriggerDisplay({
    spec: props.spec,
    model: props.model,
    descriptors,
  });

  const reasoningLabel =
    props.provider === "claudeAgent" && isClaudeUltrathinkPrompt(props.prompt)
      ? "Ultrathink"
      : optionReasoningLabel;

  return (
    <Popover
      open={open}
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
            size={props.size ?? "sm"}
            aria-label={`Choose model and reasoning: ${modelLabel}, ${reasoningLabel}${showFastModeIcon ? ", fast mode on" : ""}`}
            className="min-w-0 shrink-0 justify-start whitespace-nowrap"
            data-codex-model-reasoning-picker-trigger
            title={`${modelLabel} · ${reasoningLabel}${showFastModeIcon ? " · Fast" : ""}`}
            onClick={(event) => setShowMoreOptions(event.ctrlKey || event.metaKey)}
          />
        }
      >
        <span className="flex min-w-0 items-center gap-1.5">
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
          <span>{modelLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{reasoningLabel}</span>
          <ComposerControlChevron size={props.size ?? "sm"} />
        </span>
      </PopoverTrigger>
      <PopoverPopup
        {...composerFloatingLayerProps}
        align="start"
        className="max-w-[calc(100vw-0.5rem)] p-0"
        viewportClassName="overflow-x-auto p-0"
      >
        <ModelReasoningModal
          spec={props.spec}
          prompt={props.prompt ?? ""}
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
        {showMoreOptions && props.traitsMenuContent ? (
          <div className="border-t border-border/70 p-1">
            <Menu>
              <MenuTrigger
                render={<ComposerControl size="sm" className="w-full justify-between" />}
              >
                More options
                <ComposerControlChevron size="sm" />
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
