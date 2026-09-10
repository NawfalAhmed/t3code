import type {
  ProviderDriverKind,
  ProviderOptionDescriptor,
  ProviderOptionSelection,
  ServerProviderModel,
} from "@t3tools/contracts";
import {
  buildProviderOptionSelectionsFromDescriptors,
  getProviderOptionCurrentValue,
  getProviderOptionDescriptors,
  isClaudeUltrathinkPrompt,
} from "@t3tools/shared/model";
import { memo } from "react";

import { getProviderModelCapabilities } from "../../providerModels";
import { ModelReasoningGrid, type ModelReasoningGridSpec } from "./ModelReasoningGrid";
import { replaceDescriptorCurrentValue } from "./TraitsPicker";

type ProviderOptions = ReadonlyArray<ProviderOptionSelection>;

type FastModeControl =
  | {
      descriptor: Extract<ProviderOptionDescriptor, { type: "boolean" }>;
      enabled: boolean;
      nextValue: boolean;
    }
  | {
      descriptor: Extract<ProviderOptionDescriptor, { type: "select" }>;
      enabled: boolean;
      nextValue: string;
    };

export function getFastModeControl(
  descriptors: ReadonlyArray<ProviderOptionDescriptor>,
): FastModeControl | null {
  const booleanDescriptor = descriptors.find(
    (descriptor) => descriptor.type === "boolean" && descriptor.id === "fastMode",
  );
  if (booleanDescriptor?.type === "boolean") {
    const enabled = booleanDescriptor.currentValue === true;
    return { descriptor: booleanDescriptor, enabled, nextValue: !enabled };
  }

  const serviceTierDescriptor = descriptors.find(
    (descriptor) => descriptor.type === "select" && descriptor.id === "serviceTier",
  );
  if (serviceTierDescriptor?.type !== "select") {
    return null;
  }
  const fastOption = serviceTierDescriptor.options.find(
    (option) =>
      option.id === "priority" ||
      option.id === "fast" ||
      option.label.trim().toLowerCase() === "fast",
  );
  const standardOption =
    serviceTierDescriptor.options.find((option) => option.id === "default") ??
    serviceTierDescriptor.options.find(
      (option) => option.label.trim().toLowerCase() === "standard",
    );
  if (!fastOption || !standardOption) {
    return null;
  }
  const currentValue = getProviderOptionCurrentValue(serviceTierDescriptor);
  const enabled = currentValue === fastOption.id;
  return {
    descriptor: serviceTierDescriptor,
    enabled,
    nextValue: enabled ? standardOption.id : fastOption.id,
  };
}

type ContextWindowControl = {
  descriptor: Extract<ProviderOptionDescriptor, { type: "select" }>;
  enabled: boolean;
  nextValue: string;
};

export function getContextWindowControl(
  descriptors: ReadonlyArray<ProviderOptionDescriptor>,
): ContextWindowControl | null {
  const descriptor = descriptors.find(
    (candidate) => candidate.type === "select" && candidate.id === "contextWindow",
  );
  if (descriptor?.type !== "select") {
    return null;
  }
  const oneMillionOption = descriptor.options.find((option) => option.id === "1m");
  const twoHundredThousandOption = descriptor.options.find((option) => option.id === "200k");
  if (!oneMillionOption || !twoHundredThousandOption) {
    return null;
  }
  const enabled = getProviderOptionCurrentValue(descriptor) === oneMillionOption.id;
  return {
    descriptor,
    enabled,
    nextValue: enabled ? twoHundredThousandOption.id : oneMillionOption.id,
  };
}

export type ModelReasoningModalProps = {
  spec: ModelReasoningGridSpec;
  prompt?: string;
  provider: ProviderDriverKind;
  models: ReadonlyArray<ServerProviderModel>;
  model: string;
  modelOptions: ProviderOptions | null | undefined;
  getModelDisabledReason?: (model: string) => string | null;
  onModelOptionsChange: (options: ProviderOptions | undefined) => void;
  onModelChange: (model: string, options: ProviderOptions | undefined) => void;
  onSelectionComplete?: () => void;
};

export const ModelReasoningModal = memo(function ModelReasoningModal(
  props: ModelReasoningModalProps,
) {
  const descriptors = getProviderOptionDescriptors({
    caps: getProviderModelCapabilities(props.models, props.model, props.provider),
    selections: props.modelOptions,
  });
  const reasoningDescriptor = descriptors.find(
    (descriptor) =>
      descriptor.type === "select" &&
      (descriptor.id === "reasoningEffort" || descriptor.id === "effort"),
  );
  if (reasoningDescriptor?.type !== "select") {
    return null;
  }
  const selectedReasoning =
    props.provider === "claudeAgent" && isClaudeUltrathinkPrompt(props.prompt)
      ? "ultrathink"
      : getProviderOptionCurrentValue(reasoningDescriptor);
  const fastModeControl = props.provider === "codex" ? getFastModeControl(descriptors) : null;
  const contextWindowControl =
    props.provider === "claudeAgent" ? getContextWindowControl(descriptors) : null;

  return (
    <ModelReasoningGrid
      spec={props.spec}
      selectedModel={props.model}
      selectedReasoning={typeof selectedReasoning === "string" ? selectedReasoning : null}
      fastModeEnabled={fastModeControl?.enabled ?? false}
      showFastMode={fastModeControl !== null}
      contextWindowEnabled={contextWindowControl?.enabled ?? false}
      showContextWindow={contextWindowControl !== null}
      {...(props.getModelDisabledReason
        ? { getModelDisabledReason: props.getModelDisabledReason }
        : {})}
      onFastModeToggle={() => {
        if (!fastModeControl) return;
        props.onModelOptionsChange(
          buildProviderOptionSelectionsFromDescriptors(
            replaceDescriptorCurrentValue(
              descriptors,
              fastModeControl.descriptor.id,
              fastModeControl.nextValue,
            ),
          ),
        );
      }}
      onContextWindowToggle={() => {
        if (!contextWindowControl) return;
        props.onModelOptionsChange(
          buildProviderOptionSelectionsFromDescriptors(
            replaceDescriptorCurrentValue(
              descriptors,
              contextWindowControl.descriptor.id,
              contextWindowControl.nextValue,
            ),
          ),
        );
      }}
      onSelectionChange={(nextModel, reasoning) => {
        const nextDescriptors = getProviderOptionDescriptors({
          caps: getProviderModelCapabilities(props.models, nextModel, props.provider),
          selections: props.modelOptions,
        });
        const nextReasoningDescriptor = nextDescriptors.find(
          (descriptor) =>
            descriptor.type === "select" &&
            (descriptor.id === "reasoningEffort" || descriptor.id === "effort"),
        );
        if (
          nextReasoningDescriptor?.type !== "select" ||
          !nextReasoningDescriptor.options.some((option) => option.id === reasoning)
        ) {
          return;
        }
        props.onModelChange(
          nextModel,
          buildProviderOptionSelectionsFromDescriptors(
            replaceDescriptorCurrentValue(nextDescriptors, nextReasoningDescriptor.id, reasoning),
          ),
        );
        props.onSelectionComplete?.();
      }}
    />
  );
});
