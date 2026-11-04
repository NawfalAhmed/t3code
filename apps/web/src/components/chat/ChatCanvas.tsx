import { useLayoutEffect, useRef, useState, type ComponentProps, type CSSProperties } from "react";
import { useStore } from "zustand";
import { ChatCanvasContext } from "./ChatCanvasContext";
import type { ChatCanvasPreview } from "./chatCanvasLayout";
import { resolveChatCanvasModel, type ChatCanvasStore } from "./canvasStore";
import { selectThreadPanelOpen, useRightPanelStore } from "../../rightPanelStore";
import { observeResize } from "../../lib/observeResize";
import { DRAFT_HERO_TRANSITION_ANIMATION_ID } from "./draftHeroTransition";
import type { ScopedThreadRef } from "@t3tools/contracts";
import { usePanelAnimationSettings } from "../../panelAnimations";

export function ChatCanvas({
  store,
  threadRef,
  preview,
  composerOverlayElement,
  detailsCardTopInset = 0,
  children,
  ...props
}: Omit<ComponentProps<"div">, "className" | "style" | "ref"> & {
  store: ChatCanvasStore;
  /** The thread whose details card sits on the canvas; other threads' measurements are stale. */
  threadRef: ScopedThreadRef | null;
  /** The thread's mini player while it renders on this canvas. */
  preview: ChatCanvasPreview | null;
  composerOverlayElement: HTMLElement | null;
  detailsCardTopInset?: number;
}) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const widthProbeRef = useRef<HTMLDivElement | null>(null);
  const [timelineElement, registerTimeline] = useState<HTMLElement | null>(null);
  const measurements = useStore(store, (state) => state.measurements);
  const detailsCardMeasurement = useStore(store, (state) => state.detailsCardMeasurement);
  const detailsFooterHeight = useStore(store, (state) => state.detailsFooterHeight);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- observes canvas, find bar and timeline resizes and writes the measurements to the canvas store
  useLayoutEffect(() => {
    const element = elementRef.current;
    const probe = widthProbeRef.current;
    if (!element || !probe) return;
    const findBar =
      detailsCardTopInset > 0 ? element.querySelector<HTMLElement>("[data-thread-find-bar]") : null;
    const composerSurface =
      composerOverlayElement?.querySelector<HTMLElement>(
        '[data-chat-composer-main-surface="true"]',
      ) ?? null;
    let disposed = false;
    const measure = () => {
      // The draft hero FLIP moves the composer by transform, which no resize reports, so measure again where it lands.
      for (const animation of composerOverlayElement?.getAnimations?.({ subtree: true }) ?? []) {
        if (animation.id !== DRAFT_HERO_TRANSITION_ANIMATION_ID) continue;
        animation.finished.then(
          () => !disposed && measure(),
          () => undefined,
        );
      }
      const canvasBounds = element.getBoundingClientRect();
      const findBarBounds = findBar?.getBoundingClientRect();
      const composerBounds = composerSurface?.getBoundingClientRect();
      const styles = getComputedStyle(probe);
      store.getState().setMeasurements({
        findBar:
          detailsCardTopInset > 0
            ? {
                left: findBarBounds ? findBarBounds.left - canvasBounds.left : 0,
                right: findBarBounds ? findBarBounds.right - canvasBounds.left : 0,
                bottom: findBarBounds ? findBarBounds.bottom - canvasBounds.top : 0,
              }
            : null,
        width: element.clientWidth,
        height: element.clientHeight,
        padding: Number.parseFloat(styles.paddingLeft),
        maxChatWidth: Number.parseFloat(styles.width),
        minChatWidth: Number.parseFloat(styles.minWidth),
        composerHeight: composerOverlayElement?.getBoundingClientRect().height ?? 0,
        // 32px is the context strip below the input, so the usage card spans it too.
        composerBottom: composerBounds ? composerBounds.bottom + 32 - canvasBounds.top : null,
        timelineGutter: timelineElement
          ? (timelineElement.offsetWidth - timelineElement.clientWidth) / 2
          : 0,
      });
    };
    measure();
    const observed: Element[] = [element, probe];
    if (findBar) observed.push(findBar);
    if (composerOverlayElement) observed.push(composerOverlayElement);
    if (timelineElement) observed.push(timelineElement);
    const stopObserving = observeResize(observed, measure);
    return () => {
      disposed = true;
      stopObserving();
    };
  }, [store, composerOverlayElement, timelineElement, detailsCardTopInset]);
  const detailsCardInlineOpen = useRightPanelStore((state) =>
    threadRef === null
      ? false
      : selectThreadPanelOpen(state.threadPanelVisibilityByThreadKey, threadRef, "inline"),
  );
  const model = resolveChatCanvasModel({
    measurements,
    detailsCardMeasurement,
    detailsFooterHeight,
    threadRef,
    preview,
    detailsCardInlineOpen,
  });
  const { active: panelAnimationsActive } = usePanelAnimationSettings();
  const layoutKey = [
    threadRef?.environmentId,
    threadRef?.threadId,
    measurements.width,
    measurements.height,
    detailsCardTopInset,
    preview?.key,
    preview?.width,
    preview?.position?.x,
    preview?.position?.y,
    preview?.source.width,
    preview?.source.height,
  ].join(":");
  const [laneTransition, setLaneTransition] = useState({
    layoutKey,
    open: detailsCardInlineOpen,
    enabled: false,
  });
  if (laneTransition.layoutKey !== layoutKey || laneTransition.open !== detailsCardInlineOpen) {
    setLaneTransition({
      layoutKey,
      open: detailsCardInlineOpen,
      enabled:
        laneTransition.layoutKey === layoutKey && laneTransition.open !== detailsCardInlineOpen,
    });
  }
  const context = {
    container: model.container,
    lane: model.lane,
    layout: model.layout,
    previewKey: preview?.key ?? null,
    registerTimeline,
    measureDetailsCard: store.getState().measureDetailsCard,
    detailsFooterHeight,
    measureDetailsFooter: store.getState().measureDetailsFooter,
    detailsCardTopInset: model.detailsCardTopInset,
    preferredDetailsCard: model.preferredDetailsCard,
    detailsCardPlacement: model.detailsCardPlacement,
    composerBottom: model.composerBottom,
  };
  const { layout } = context;
  return (
    <ChatCanvasContext value={context}>
      <div
        {...props}
        ref={elementRef}
        data-chat-canvas
        data-chat-layout-animations={(panelAnimationsActive && laneTransition.enabled) || undefined}
        data-preview-overlaps-chat={layout.overlapsChat || undefined}
        className="relative flex min-h-0 min-w-0 flex-1 flex-col"
        style={
          {
            "--chat-timeline-gutter": `${measurements.timelineGutter}px`,
            "--chat-lane-inset-start": `${layout.chat.insetStart}px`,
            "--chat-lane-inset-end": `${layout.chat.insetEnd}px`,
          } as CSSProperties
        }
      >
        <div
          ref={widthProbeRef}
          aria-hidden
          className="pointer-events-none invisible absolute h-0 w-(--chat-content-max-width) min-w-[40rem] box-content ps-3 sm:ps-12"
        />
        {children}
      </div>
    </ChatCanvasContext>
  );
}
