import type { ChatComposerProps } from "./ChatComposer";
import type { PromptUltrathink } from "./TraitsPicker";
import type { ProviderInstanceEntry } from "../../providerInstances";
import { type AppModelOption } from "../../modelSelection";
import { CircleAlertIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { CompactComposerControlsMenu } from "./CompactComposerControlsMenu";
import { ComposerControl } from "./ComposerControl";
import {
  ComposerPermissionsSection,
  ComposerFooterModeControls,
  ComposerModelPicker,
  type RuntimeModeOption,
} from "./ComposerFooterControls";
import {
  type EnvironmentId,
  type ModelSelection,
  type ProviderOptionSelection,
  type ProviderDriverKind,
  type ProviderInstanceId,
  type ProviderInteractionMode,
  type RuntimeMode,
  type ServerProvider,
} from "@t3tools/contracts";
import type { EffortDisplay } from "@t3tools/contracts/settings";
import { cn } from "~/lib/utils";
import {
  renderProviderTraitsMenuContent,
  renderProviderTraitsPicker,
} from "./composerProviderState";
import type { useComposerProviderModel } from "./useComposerProviderModel";
import { resolveComposerControlsOwnership } from "./composerControlsOwnership";
import {
  ModelReasoningPicker,
  modelReasoningMoreHiddenDescriptorIds,
  shouldShowModelReasoningMoreOption,
} from "./ModelReasoningPicker";
import { buildModelReasoningGridSpec } from "./ModelReasoningGrid";
import type { ProviderModelPicker } from "./ProviderModelPicker";

/**
 * The composer footer controls: model picker, traits, mode controls and the overflow menu for
 * blocks that do not fit. Rendered in the expanded footer or the resting controls host.
 */
// Model and effort sit a word space apart, so hover and open states brighten text, not a box.
const TEXT_CONTROL_STATES =
  "hover:bg-transparent data-pressed:bg-transparent data-popup-open:bg-transparent data-pressed:text-foreground data-popup-open:text-foreground";

export function ComposerControlsBar(props: {
  environmentId: EnvironmentId;
  routeKind: ChatComposerProps["routeKind"];
  routeThreadRef: ChatComposerProps["routeThreadRef"];
  draftId: ChatComposerProps["draftId"];
  selectedProvider: ProviderDriverKind;
  selectedInstanceId: ProviderInstanceId;
  selectedModel: string;
  selectedProviderModels: ServerProvider["models"];
  composerModelOptions: ReturnType<typeof useComposerProviderModel>["composerModelOptions"];
  reportedModelSelection: ChatComposerProps["reportedModelSelection"];
  promptUltrathink: PromptUltrathink;
  onPromptEdit: (edit: (prompt: string) => string) => void;
  onModelReasoningOptionsChange: (
    options: ReadonlyArray<ProviderOptionSelection> | undefined,
  ) => void;
  providerToggle: ComponentProps<typeof ProviderModelPicker>["providerToggle"] | null;
  planModeEnabled: boolean;
  planModeUiEnabled: boolean;
  effortDisplay: EffortDisplay;
  permissionsShownInStrip: boolean;
  interactionMode: ProviderInteractionMode;
  compatibleRuntimeMode: RuntimeMode;
  defaultRuntimeMode: RuntimeMode | undefined;
  compatibleRuntimeModeOptions: ReadonlyArray<RuntimeModeOption>;
  toggleInteractionMode: () => void;
  handleRuntimeModeChange: (mode: RuntimeMode) => void;
  composerControlsCollapsed: boolean;
  composerControlsHidden: boolean;
  restingHiddenBlockCount: number;
  iconOnlyBlockCount: number;
  showProviderUnavailable: boolean;
  providerSetupInstanceId: ProviderInstanceId | undefined;
  onOpenProviderSetup: ChatComposerProps["onOpenProviderSetup"];
  providerCatalogPending: boolean;
  isSendBusy: boolean;
  multipleModelsEnabled: boolean;
  multipleModelSelections: ChatComposerProps["multipleModelSelections"];
  onMultipleModelSelectionsChange: ChatComposerProps["onMultipleModelSelectionsChange"];
  selectedModelSelection: ModelSelection;
  onProviderModelSelect: ChatComposerProps["onProviderModelSelect"];
  activeThreadModelSelection: ChatComposerProps["activeThreadModelSelection"];
  selectedModelForPickerWithCustomFallback: string;
  lockedProvider: ChatComposerProps["lockedProvider"];
  lockedContinuationGroupKey: string | null;
  providerInstanceEntries: ReadonlyArray<ProviderInstanceEntry>;
  keybindings: ChatComposerProps["keybindings"];
  modelOptionsByInstance: ReadonlyMap<ProviderInstanceId, ReadonlyArray<AppModelOption>>;
  terminalOpen: boolean;
  modelPickerOpen: boolean;
  onModelPickerOpenChange: (open: boolean) => void;
  modelPickerIconClassName: string | undefined;
  getModelDisabledReason: ChatComposerProps["getModelDisabledReason"];
}) {
  const {
    environmentId,
    routeKind,
    routeThreadRef,
    draftId,
    selectedProvider,
    selectedInstanceId,
    selectedModel,
    selectedProviderModels,
    composerModelOptions,
    reportedModelSelection,
    promptUltrathink,
    onPromptEdit,
    onModelReasoningOptionsChange,
    providerToggle,
    planModeEnabled,
    planModeUiEnabled,
    interactionMode,
    compatibleRuntimeMode,
    compatibleRuntimeModeOptions,
    toggleInteractionMode,
    handleRuntimeModeChange,
    composerControlsCollapsed,
    composerControlsHidden,
    restingHiddenBlockCount: measuredHiddenBlockCount,
    iconOnlyBlockCount,
    showProviderUnavailable,
    providerSetupInstanceId,
    onOpenProviderSetup,
    providerCatalogPending,
    isSendBusy,
    multipleModelsEnabled,
    multipleModelSelections,
    onMultipleModelSelectionsChange,
    selectedModelSelection,
    onProviderModelSelect,
    activeThreadModelSelection,
    selectedModelForPickerWithCustomFallback,
    lockedProvider,
    lockedContinuationGroupKey,
    providerInstanceEntries,
    keybindings,
    modelOptionsByInstance,
    terminalOpen,
    modelPickerOpen,
    onModelPickerOpenChange,
    modelPickerIconClassName,
    getModelDisabledReason,
  } = props;
  const providerTraitsMenuContent = renderProviderTraitsMenuContent({
    provider: selectedProvider,
    instanceId: selectedInstanceId,
    ...(routeKind === "server" ? { threadRef: routeThreadRef } : {}),
    ...(routeKind === "draft" && draftId ? { draftId } : {}),
    model: selectedModel,
    models: selectedProviderModels,
    modelOptions: composerModelOptions?.[selectedInstanceId],
    reportedModelSelection,
    promptUltrathink,
    onPromptEdit,
    planModeEnabled,
  });
  const providerTraitsPickerInput = {
    provider: selectedProvider,
    instanceId: selectedInstanceId,
    ...(routeKind === "server" ? { threadRef: routeThreadRef } : {}),
    ...(routeKind === "draft" && draftId ? { draftId } : {}),
    model: selectedModel,
    models: selectedProviderModels,
    modelOptions: composerModelOptions?.[selectedInstanceId],
    reportedModelSelection,
    promptUltrathink,
    onPromptEdit,
    planModeEnabled,
    isComposerOwned: true,
    effortDisplay: props.effortDisplay,
    triggerClassName: cn("ps-1.5 pe-1", TEXT_CONTROL_STATES),
    ...(!props.permissionsShownInStrip
      ? {
          extraMenuContent: (
            <ComposerPermissionsSection
              runtimeMode={compatibleRuntimeMode}
              runtimeModeOptions={compatibleRuntimeModeOptions}
              onRuntimeModeChange={handleRuntimeModeChange}
            />
          ),
        }
      : {}),
  } satisfies Parameters<typeof renderProviderTraitsPicker>[0];
  const modelReasoningSpec =
    multipleModelSelections === null
      ? buildModelReasoningGridSpec({
          provider: selectedProvider,
          models: selectedProviderModels,
          model: selectedModel,
          modelOptions: composerModelOptions?.[selectedInstanceId],
        })
      : null;
  const genericProviderTraitsPicker = modelReasoningSpec
    ? null
    : renderProviderTraitsPicker(providerTraitsPickerInput);
  const {
    accessDisplay,
    showModeBlock,
    hiddenBlockCount: restingHiddenBlockCount,
    hiddenBlockIds: hiddenRestingBlockIds,
    traitsHidden,
    effortOwnsModeShortcut,
    overflowShowsPermissions,
  } = resolveComposerControlsOwnership({
    matchesDefault: compatibleRuntimeMode === props.defaultRuntimeMode,
    permissionsShownInStrip: props.permissionsShownInStrip,
    hasTraits: modelReasoningSpec !== null || genericProviderTraitsPicker !== null,
    planModeUiEnabled,
    collapsed: composerControlsCollapsed,
    measuredHiddenBlockCount,
  });
  const providerModelReasoningPicker = modelReasoningSpec ? (
    <ModelReasoningPicker
      size={composerControlsCollapsed ? "xs" : "sm"}
      effortDisplay={props.effortDisplay}
      permissionsOwnsShortcut={effortOwnsModeShortcut}
      spec={modelReasoningSpec}
      promptUltrathink={promptUltrathink}
      traitsMenuContent={renderProviderTraitsMenuContent({
        provider: selectedProvider,
        instanceId: selectedInstanceId,
        ...(routeKind === "server" ? { threadRef: routeThreadRef } : {}),
        ...(routeKind === "draft" && draftId ? { draftId } : {}),
        model: selectedModel,
        models: selectedProviderModels,
        modelOptions: composerModelOptions?.[selectedInstanceId],
        reportedModelSelection,
        promptUltrathink,
        onPromptEdit,
        planModeEnabled,
        hiddenDescriptorIds: modelReasoningMoreHiddenDescriptorIds(selectedProvider),
        optionFilter: shouldShowModelReasoningMoreOption,
      })}
      provider={selectedProvider}
      models={selectedProviderModels}
      model={selectedModel}
      modelOptions={composerModelOptions?.[selectedInstanceId]}
      {...(!props.permissionsShownInStrip
        ? {
            permissions: {
              runtimeMode: compatibleRuntimeMode,
              runtimeModeOptions: compatibleRuntimeModeOptions,
              onRuntimeModeChange: handleRuntimeModeChange,
            },
          }
        : {})}
      getModelDisabledReason={(nextModel) =>
        selectedProvider === "claudeAgent" && promptUltrathink === "body"
          ? "Reasoning is controlled by ultrathink in the prompt"
          : getModelDisabledReason(selectedInstanceId, nextModel)
      }
      onModelOptionsChange={onModelReasoningOptionsChange}
      onModelChange={(nextModel, nextOptions) => {
        if (selectedProvider === "claudeAgent" && promptUltrathink !== "none") {
          onPromptEdit((prompt) => prompt.replace(/^Ultrathink:\s*/i, ""));
        }
        onProviderModelSelect(selectedInstanceId, nextModel, nextOptions);
      }}
    />
  ) : null;
  const providerTraitsPicker = providerModelReasoningPicker ?? genericProviderTraitsPicker;
  const restingProviderTraitsPicker =
    providerModelReasoningPicker ??
    renderProviderTraitsPicker({
      ...providerTraitsPickerInput,
      size: composerControlsCollapsed ? "xs" : "sm",
      hidden: composerControlsHidden || traitsHidden,
      extraMenuOwnsModeShortcut: effortOwnsModeShortcut,
    });
  const restingBlockDefs = [
    ...(providerTraitsPicker
      ? [
          {
            id: "traits",
            content: restingProviderTraitsPicker,
          },
        ]
      : []),
    ...(showModeBlock
      ? [
          {
            id: "mode",
            content: (
              <ComposerFooterModeControls
                showInteractionModeToggle={planModeUiEnabled}
                interactionMode={interactionMode}
                runtimeMode={compatibleRuntimeMode}
                runtimeModeOptions={compatibleRuntimeModeOptions}
                accessDisplay={accessDisplay}
                emphasized={compatibleRuntimeMode !== props.defaultRuntimeMode}
                size={composerControlsCollapsed ? "xs" : "sm"}
                hidden={composerControlsHidden || restingHiddenBlockCount > 0}
                onToggleInteractionMode={toggleInteractionMode}
                onRuntimeModeChange={handleRuntimeModeChange}
              />
            ),
          },
        ]
      : []),
  ];
  // Its own element, so typing (which rebuilds the controls around it) leaves it cached.
  const composerModelPicker = (
    <ComposerModelPicker
      environmentId={environmentId}
      compact={false}
      isComposerOwned
      disabled={providerCatalogPending || isSendBusy}
      {...(providerToggle ? { providerToggle } : {})}
      multipleModelsEnabled={multipleModelsEnabled}
      multipleModelSelections={multipleModelSelections}
      onMultipleModelSelectionsChange={onMultipleModelSelectionsChange}
      selectedModelSelection={selectedModelSelection}
      onProviderModelSelect={onProviderModelSelect}
      activeInstanceId={
        providerCatalogPending
          ? (activeThreadModelSelection?.instanceId ?? selectedInstanceId)
          : selectedInstanceId
      }
      model={
        providerCatalogPending
          ? (activeThreadModelSelection?.model ?? selectedModelForPickerWithCustomFallback)
          : selectedModelForPickerWithCustomFallback
      }
      lockedProvider={lockedProvider}
      lockedContinuationGroupKey={lockedContinuationGroupKey}
      instanceEntries={providerInstanceEntries}
      keybindings={keybindings}
      modelOptionsByInstance={modelOptionsByInstance}
      size={composerControlsCollapsed ? "xs" : "sm"}
      triggerClassName={
        providerToggle
          ? cn("shrink-0 justify-center", composerControlsCollapsed ? "px-1" : "px-1.5")
          : cn(
              "pe-1",
              TEXT_CONTROL_STATES,
              composerControlsCollapsed ? "min-w-13 shrink text-xs!" : "min-w-13",
            )
      }
      terminalOpen={terminalOpen}
      open={modelPickerOpen}
      instanceIndicatorBackground={
        composerControlsCollapsed
          ? "color-mix(in srgb, var(--chat-composer-glass-surface) var(--glass-opacity), transparent)"
          : "var(--contrast-input)"
      }
      {...(modelPickerIconClassName
        ? { activeProviderIconClassName: modelPickerIconClassName }
        : {})}
      onOpenChange={onModelPickerOpenChange}
      getModelDisabledReason={getModelDisabledReason}
      onOpenProviderSetup={onOpenProviderSetup}
    />
  );
  return showProviderUnavailable ? (
    <ComposerControl
      type="button"
      disabled={!providerSetupInstanceId}
      onClick={() => {
        if (providerSetupInstanceId) {
          onOpenProviderSetup(providerSetupInstanceId);
        }
      }}
      data-chat-provider-unavailable="true"
      className="shrink-0"
    >
      <CircleAlertIcon className="size-4" />
      {providerSetupInstanceId ? "Open provider settings" : "No provider available"}
    </ComposerControl>
  ) : (
    <>
      {composerModelPicker}

      <>
        {restingBlockDefs.map((def, index) => {
          const hidden = index >= restingBlockDefs.length - restingHiddenBlockCount;
          return (
            <div
              key={def.id}
              data-resting-block={def.id}
              data-composer-block-icon-only={
                index >= restingBlockDefs.length - iconOnlyBlockCount ? "true" : "false"
              }
              aria-hidden={hidden || undefined}
              inert={hidden || undefined}
              className={cn(
                "flex w-max min-w-max shrink-0 items-center gap-1",
                hidden && "pointer-events-none invisible absolute",
                index >= restingBlockDefs.length - iconOnlyBlockCount &&
                  "[&_[data-composer-control-label]]:pointer-events-none [&_[data-composer-control-label]]:invisible [&_[data-composer-control-label]]:absolute [&_[data-composer-control-label]]:w-max [&_[data-composer-control-label]]:max-w-none [&_[data-composer-control-compact-icon]]:[visibility:inherit] [&_[data-composer-control-compact-icon]]:relative",
              )}
            >
              {def.content}
            </div>
          );
        })}
        <div
          data-resting-controls-overflow
          aria-hidden={hiddenRestingBlockIds.length === 0 || undefined}
          inert={hiddenRestingBlockIds.length === 0 || undefined}
          className={cn(
            "min-w-0 shrink-0",
            hiddenRestingBlockIds.length === 0 && "pointer-events-none invisible absolute",
          )}
        >
          <CompactComposerControlsMenu
            interactionMode={interactionMode}
            runtimeMode={compatibleRuntimeMode}
            runtimeModeOptions={compatibleRuntimeModeOptions}
            size={composerControlsCollapsed ? "xs" : "sm"}
            hidden={composerControlsHidden || hiddenRestingBlockIds.length === 0}
            showInteractionModeToggle={planModeUiEnabled && hiddenRestingBlockIds.includes("mode")}
            traitsMenuContent={
              hiddenRestingBlockIds.includes("traits") ? providerTraitsMenuContent : undefined
            }
            showPermissions={overflowShowsPermissions}
            onToggleInteractionMode={toggleInteractionMode}
            onRuntimeModeChange={handleRuntimeModeChange}
          />
        </div>
      </>
    </>
  );
}
