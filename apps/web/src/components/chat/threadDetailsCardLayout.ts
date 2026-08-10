import type { PreviewMiniPlayerFrame } from "../preview/previewMiniPlayerLayout";
import { DETAILS_CARD_CLEARANCE } from "./chatCanvasLayout";

export const THREAD_DETAILS_CARD_GAP = 12;
// Keep in sync with --thread-details-panel-width.
const THREAD_DETAILS_CARD_WIDTH = 280;
const MIN_CARD_HEIGHT = 160;

export function resolveThreadDetailsCardDensity(
  height: number,
  content: { full: number; compact: number },
) {
  if (content.full === 0 || content.full <= height) return "full";
  if (content.compact === 0 || content.compact <= height) return "compact";
  return "essential";
}

export function resolveThreadDetailsCardLayout({
  container,
  lane,
  frame,
  overlapsDetailsCard = false,
  topInset = 0,
}: {
  container: { width: number; height: number };
  lane: { padding: number; minChatWidth: number };
  frame: PreviewMiniPlayerFrame | null;
  overlapsDetailsCard?: boolean;
  topInset?: number;
}) {
  const gap = THREAD_DETAILS_CARD_GAP;
  const width = THREAD_DETAILS_CARD_WIDTH;
  const x = container.width - width - gap;
  if (x - DETAILS_CARD_CLEARANCE - lane.padding < lane.minChatWidth) return null;
  const y = gap + topInset;
  const height =
    overlapsDetailsCard && frame && frame.x + frame.width > x - gap && frame.x < x + width + gap
      ? Math.min(container.height - y - gap, frame.y - y - gap)
      : container.height - y - gap;
  if (height < MIN_CARD_HEIGHT) return null;
  return {
    x,
    right: gap,
    width,
    y,
    height,
  } as const;
}

/**
 * The footer's bottom lines up with the composer input, or the column's end when
 * that comes first. It yields to the card when both cannot fit, and hides
 * under a preview rather than pushing it around.
 */
export function resolveThreadDetailsFooterLayout({
  placement,
  footerHeight,
  composerBottom,
  frame,
}: {
  placement: NonNullable<ReturnType<typeof resolveThreadDetailsCardLayout>>;
  footerHeight: number;
  composerBottom: number | null;
  frame: PreviewMiniPlayerFrame | null;
}) {
  const columnBottom = placement.y + placement.height;
  const bottom = composerBottom === null ? columnBottom : Math.min(columnBottom, composerBottom);
  const top = bottom - footerHeight;
  const cardRoom = top - THREAD_DETAILS_CARD_GAP - placement.y;
  const covered =
    frame !== null &&
    frame.x < placement.x + placement.width &&
    frame.x + frame.width > placement.x &&
    frame.y < bottom &&
    frame.y + frame.height > top;
  const visible = footerHeight > 0 && cardRoom >= MIN_CARD_HEIGHT && !covered;
  return {
    bottom,
    visible,
    cardHeight: visible ? Math.min(placement.height, cardRoom) : placement.height,
  };
}
