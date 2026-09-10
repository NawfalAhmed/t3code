import type {
  ProviderDriverKind,
  ProviderOptionSelection,
  ServerProviderModel,
} from "@t3tools/contracts";
import { getProviderOptionDescriptors } from "@t3tools/shared/model";
import { ZapIcon } from "lucide-react";
import { memo, type PointerEvent as ReactPointerEvent, useRef, useState } from "react";

import { getModelPickerVariant, type ModelVariant } from "./modelPickerVariants";
import { cn } from "~/lib/utils";
import { getProviderModelCapabilities } from "../../providerModels";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

type ProviderOptions = ReadonlyArray<ProviderOptionSelection>;

type ReasoningOption = {
  id: string;
  label: string;
};

type ModelReasoningPoint = {
  model: string;
  reasoning: string;
  x: number;
  y: number;
};

type ModelReasoningSelection = Pick<ModelReasoningPoint, "model" | "reasoning">;

export function findNearestModelReasoningPoint(
  points: ReadonlyArray<ModelReasoningPoint>,
  x: number,
  y: number,
): ModelReasoningSelection | null {
  let nearest: ModelReasoningPoint | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const point of points) {
    const distance = (point.x - x) ** 2 + (point.y - y) ** 2;
    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }
  return nearest ? { model: nearest.model, reasoning: nearest.reasoning } : null;
}

export type ModelReasoningRow = {
  model: string;
  label: string;
  variant: ModelVariant;
  reasoningOptions: ReadonlyArray<ReasoningOption>;
};

export type ModelReasoningGridSpec = {
  columns: ReadonlyArray<ReasoningOption>;
  rows: ReadonlyArray<ModelReasoningRow>;
};

const VISIBLE_REASONING_OPTIONS: ReadonlyArray<ReasoningOption> = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "xhigh", label: "XHigh" },
];

const MODEL_VARIANT_STYLES: Record<ModelVariant, { row: string; fill: string }> = {
  astra: {
    row: "bg-[#46376B]/60",
    fill: "bg-[#765EB8]",
  },
  opus: {
    row: "bg-[#63431F]/60",
    fill: "bg-[#B78039]",
  },
  sonnet: {
    row: "bg-[#5A2525]/60",
    fill: "bg-[#A84242]",
  },
  fable: {
    row: "bg-[#66551A]/60",
    fill: "bg-[#B69B2E]",
  },
  sol: {
    row: "bg-[#1B4939]/60",
    fill: "bg-[#2D8565]",
  },
  terra: {
    row: "bg-[#63431F]/60",
    fill: "bg-[#B78039]",
  },
  luna: {
    row: "bg-[#204A63]/60",
    fill: "bg-[#3987B2]",
  },
};

/** Build the model/reasoning matrix from the selected provider catalog. */
export function buildModelReasoningGridSpec(input: {
  provider: ProviderDriverKind;
  models: ReadonlyArray<ServerProviderModel>;
  model: string;
  modelOptions: ProviderOptions | null | undefined;
}): ModelReasoningGridSpec | null {
  const activeVariant = getModelPickerVariant(input.model, input.provider);
  if (!activeVariant) {
    return null;
  }

  const visibleOptions = VISIBLE_REASONING_OPTIONS;

  const rows = input.models
    .filter((candidate) => !candidate.isCustom)
    .flatMap((candidate) => {
      const candidateVariant = getModelPickerVariant(
        candidate.slug,
        input.provider,
        candidate.isCustom,
      );
      if (!candidateVariant || candidateVariant.family !== activeVariant.family) {
        return [];
      }
      const descriptors = getProviderOptionDescriptors({
        caps: getProviderModelCapabilities(input.models, candidate.slug, input.provider),
        selections: input.modelOptions,
      });
      const reasoningDescriptor = descriptors.find(
        (descriptor): descriptor is Extract<(typeof descriptors)[number], { type: "select" }> =>
          descriptor.type === "select" &&
          descriptor.id === (input.provider === "claudeAgent" ? "effort" : "reasoningEffort"),
      );
      if (!reasoningDescriptor) {
        return [];
      }
      return [
        {
          model: candidate.slug,
          label: candidateVariant.label,
          priority: candidateVariant.priority,
          variant: candidateVariant.variant,
          reasoningOptions: reasoningDescriptor.options
            .filter((option) => visibleOptions.some((visible) => visible.id === option.id))
            .map(({ id, label }) => ({ id, label })),
        },
      ];
    })
    .sort((left, right) => left.priority - right.priority);

  if (rows.length === 0) {
    return null;
  }

  const availableOptionById = new Map<string, ReasoningOption>();
  for (const row of rows) {
    for (const option of row.reasoningOptions) {
      availableOptionById.set(option.id, option);
    }
  }

  return {
    columns: visibleOptions.map((option) =>
      option.id === "xhigh" ? option : (availableOptionById.get(option.id) ?? option),
    ),
    rows,
  };
}

export const ModelReasoningGrid = memo(function ModelReasoningGrid(props: {
  spec: ModelReasoningGridSpec;
  selectedModel: string;
  selectedReasoning: string | null;
  fastModeEnabled: boolean;
  showFastMode: boolean;
  contextWindowEnabled: boolean;
  showContextWindow: boolean;
  getModelDisabledReason?: (model: string) => string | null;
  onFastModeToggle: () => void;
  onContextWindowToggle: () => void;
  onSelectionChange: (model: string, reasoning: string) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const dragPointsRef = useRef<ReadonlyArray<ModelReasoningPoint>>([]);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragSelectionRef = useRef<ModelReasoningSelection | null>(null);
  const [dragSelection, setDragSelection] = useState<ModelReasoningSelection | null>(null);
  const selectedModel = dragSelection?.model ?? props.selectedModel;
  const selectedReasoning = dragSelection?.reasoning ?? props.selectedReasoning;
  const reasoningColumnTemplate = props.spec.columns
    .map((column) => (column.id === "medium" ? "50px" : "2.5rem"))
    .join(" ");

  const updateDragSelection = (nextSelection: ModelReasoningSelection | null) => {
    dragSelectionRef.current = nextSelection;
    setDragSelection((current) =>
      current?.model === nextSelection?.model && current?.reasoning === nextSelection?.reasoning
        ? current
        : nextSelection,
    );
  };

  const readDragPoints = (): ReadonlyArray<ModelReasoningPoint> =>
    [
      ...(gridRef.current?.querySelectorAll<HTMLButtonElement>("[data-model][data-reasoning]") ??
        []),
    ]
      .filter((cell) => !cell.disabled)
      .map((cell) => {
        const bounds = cell.getBoundingClientRect();
        return {
          model: cell.dataset.model ?? "",
          reasoning: cell.dataset.reasoning ?? "",
          x: bounds.left + bounds.width / 2,
          y: bounds.top + bounds.height / 2,
        };
      })
      .filter((point) => point.model.length > 0 && point.reasoning.length > 0);

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    fallbackSelection: ModelReasoningSelection,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragPointerIdRef.current = event.pointerId;
    dragPointsRef.current = readDragPoints();
    updateDragSelection(
      findNearestModelReasoningPoint(dragPointsRef.current, event.clientX, event.clientY) ??
        fallbackSelection,
    );
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    const nearest = findNearestModelReasoningPoint(
      dragPointsRef.current,
      event.clientX,
      event.clientY,
    );
    if (nearest) {
      updateDragSelection(nearest);
    }
  };

  const clearDrag = () => {
    dragPointerIdRef.current = null;
    dragPointsRef.current = [];
    updateDragSelection(null);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    const nearest =
      findNearestModelReasoningPoint(dragPointsRef.current, event.clientX, event.clientY) ??
      dragSelectionRef.current;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    clearDrag();
    if (nearest) {
      props.onSelectionChange(nearest.model, nearest.reasoning);
    }
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    clearDrag();
  };

  return (
    <div
      ref={gridRef}
      className="w-max max-w-[calc(100vw-1rem)] overflow-x-auto p-2"
      data-codex-model-reasoning-grid
    >
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns: `3.25rem ${reasoningColumnTemplate}`,
        }}
      >
        <div className="flex h-7 items-center justify-start gap-1">
          {props.showFastMode ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={`Turn fast mode ${props.fastModeEnabled ? "off" : "on"}`}
                    aria-pressed={props.fastModeEnabled}
                    className={cn(
                      "flex size-6 cursor-pointer items-center justify-start rounded-lg outline-none transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ring",
                      props.fastModeEnabled ? "text-white" : "text-muted-foreground",
                    )}
                    onClick={props.onFastModeToggle}
                  />
                }
              >
                <ZapIcon
                  className="size-3.5"
                  fill={props.fastModeEnabled ? "currentColor" : "none"}
                />
              </TooltipTrigger>
              <TooltipPopup side="top">
                Fast mode {props.fastModeEnabled ? "on" : "off"}
              </TooltipPopup>
            </Tooltip>
          ) : null}
          {props.showContextWindow ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={`Turn 1M context ${props.contextWindowEnabled ? "off" : "on"}`}
                    aria-pressed={props.contextWindowEnabled}
                    className={cn(
                      "flex h-6 min-w-6 w-fit cursor-pointer items-center justify-start rounded-lg px-0.5 text-xs font-bold outline-none transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ring",
                      props.contextWindowEnabled ? "text-white" : "text-muted-foreground",
                    )}
                    data-context-window-toggle
                    onClick={props.onContextWindowToggle}
                  />
                }
              >
                1M
              </TooltipTrigger>
              <TooltipPopup side="top">
                1M context {props.contextWindowEnabled ? "on" : "off"}
              </TooltipPopup>
            </Tooltip>
          ) : null}
        </div>

        {props.spec.columns.map((column) => (
          <div
            key={column.id}
            className="whitespace-nowrap text-center font-medium text-muted-foreground/70 text-xs"
          >
            {column.label}
          </div>
        ))}

        {props.spec.rows.map((row, rowIndex) => {
          const isSelectedModel = row.model === selectedModel;
          const disabledReason = props.getModelDisabledReason?.(row.model) ?? null;
          const supportedReasoning = new Set(row.reasoningOptions.map((option) => option.id));
          const variantStyles = MODEL_VARIANT_STYLES[row.variant];
          const selectedReasoningIndex = isSelectedModel
            ? props.spec.columns.findIndex((column) => column.id === selectedReasoning)
            : -1;
          const selectedTrackPercent =
            selectedReasoningIndex < 0
              ? 0
              : ((selectedReasoningIndex + 0.5) / props.spec.columns.length) * 100;

          return (
            <div key={row.model} className="contents">
              <div
                className={cn(
                  "font-medium text-xs",
                  isSelectedModel ? "text-foreground" : "text-muted-foreground/70",
                )}
              >
                {row.label}
              </div>
              <div
                className={cn(
                  "relative grid h-6 overflow-hidden",
                  variantStyles.row,
                  rowIndex === 0 && "rounded-t-lg",
                  rowIndex === props.spec.rows.length - 1 && "rounded-b-lg",
                )}
                style={{
                  gridColumn: "2 / -1",
                  gridTemplateColumns: reasoningColumnTemplate,
                }}
              >
                {selectedTrackPercent > 0 ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-150",
                      variantStyles.fill,
                      rowIndex === 0 && "rounded-tl-lg",
                      rowIndex === props.spec.rows.length - 1 && "rounded-bl-lg",
                    )}
                    style={{ width: `${selectedTrackPercent}%` }}
                  />
                ) : null}
                {props.spec.columns.map((column) => {
                  const supported = supportedReasoning.has(column.id);
                  const selected = isSelectedModel && supported && column.id === selectedReasoning;
                  const disabled = !supported || disabledReason !== null;
                  const tooltip =
                    disabledReason ??
                    (!supported
                      ? `${column.label} reasoning is unavailable for ${row.label}`
                      : null);

                  return (
                    <Tooltip key={column.id}>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            aria-label={`${row.label}, ${column.label} reasoning`}
                            aria-pressed={selected}
                            className={cn(
                              "group relative z-10 flex h-6 touch-none select-none items-center justify-center outline-none",
                              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                              disabled
                                ? "cursor-not-allowed"
                                : "cursor-pointer active:cursor-grabbing",
                            )}
                            data-model={row.model}
                            data-reasoning={column.id}
                            disabled={disabled}
                            onClick={(event) => {
                              if (event.detail === 0) {
                                props.onSelectionChange(row.model, column.id);
                              }
                            }}
                            onPointerCancel={handlePointerCancel}
                            onPointerDown={(event) =>
                              handlePointerDown(event, {
                                model: row.model,
                                reasoning: column.id,
                              })
                            }
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                          />
                        }
                      >
                        <span
                          className={cn(
                            "rounded-full bg-white/25 transition-[width,height] duration-150",
                            selected ? "size-6 bg-white" : "size-2",
                            !disabled && !selected && "group-hover:size-4",
                            !supported && "opacity-20",
                          )}
                        />
                      </TooltipTrigger>
                      {tooltip ? <TooltipPopup side="top">{tooltip}</TooltipPopup> : null}
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
