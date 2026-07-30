import type { KeyboardEvent } from "react";
import { useComposerHandleContext } from "../../composerHandleContext";
import { useMediaQuery } from "../../hooks/useMediaQuery";

const COMPOSER_FLOATING_LAYER_SELECTOR = [
  '[data-composer-drawer-layer="true"]',
  '[data-chat-composer-floating-layer="true"]',
].join(",");

export const composerFloatingLayerProps = {
  "data-chat-composer-floating-layer": "true",
} as const;

export function moveEffortFocus(event: KeyboardEvent<HTMLElement>, arrowOffset = 0): void {
  if (
    arrowOffset === 0 &&
    (event.key.length !== 1 ||
      event.key.trim() === "" ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      event.nativeEvent.isComposing)
  )
    return;
  // Portalled options receive React events here, but they handle their own focus.
  if (!event.currentTarget.contains(event.target as Node)) return;
  const rows = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-effort-row]:not(:disabled)"),
  );
  const index = rows.findIndex((row) => row === document.activeElement);
  const next =
    arrowOffset !== 0
      ? rows[Math.min(rows.length - 1, Math.max(0, index + arrowOffset))]
      : [...rows.slice(index + 1), ...rows.slice(0, index + 1)].find((row) =>
          row.dataset.effortLevel?.toLowerCase().startsWith(event.key.toLowerCase()),
        );
  if (!next) return;
  event.preventDefault();
  event.stopPropagation();
  next.focus();
  next.scrollIntoView({ block: "nearest" });
}

export function useComposerMenuProps() {
  const composerRef = useComposerHandleContext();
  const isCoarsePointer = useMediaQuery({ pointer: "coarse" });

  return {
    ...composerFloatingLayerProps,
    // Focusing the editor on a touch device opens the on-screen keyboard, so the menu keeps its own focus return.
    finalFocus:
      composerRef && !isCoarsePointer
        ? () => {
            const activeElement = document.activeElement;
            if (activeElement !== document.body && !isInsideComposerFloatingLayer(activeElement)) {
              return false;
            }
            composerRef.current?.focusAtEnd();
            return false;
          }
        : undefined,
  };
}

function isInsideComposerFloatingLayer(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(COMPOSER_FLOATING_LAYER_SELECTOR) !== null;
}

export function isInsideCollapsedComposerControls(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('[data-chat-composer-collapsed-controls="true"]') !== null
  );
}

export function isInsideRestingComposerControlScope(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    (target.closest('[data-chat-composer-resting-controls="true"]') !== null ||
      target.closest('[data-chat-composer-resting-images="true"]') !== null ||
      target.closest("[data-composer-context-control]") !== null ||
      isInsideComposerFloatingLayer(target))
  );
}

/**
 * composer.mode marks the trigger it opens; the menu's onOpenChangeComplete then moves focus
 * to the checked permission in that menu's own popup, after the menu placed its own focus.
 */
export function markOpenToPermissions(trigger: HTMLElement): void {
  trigger.dataset.openToPermissions = "true";
}

export function focusRequestedPermission(open: boolean, trigger: HTMLElement | null): void {
  if (!trigger?.dataset.openToPermissions) return;
  delete trigger.dataset.openToPermissions;
  if (open) focusCheckedPermission(trigger);
}

/** Focuses the checked permission in the menu this trigger opened. */
export function focusCheckedPermission(trigger: HTMLElement | null): void {
  const popupId = trigger?.getAttribute("aria-controls");
  const popup = popupId ? document.getElementById(popupId) : null;
  popup
    ?.querySelector<HTMLElement>("[data-composer-permissions] [aria-checked='true']")
    ?.focus({ preventScroll: true });
}

/**
 * composer.effort marks the model picker trigger it opens; the picker then moves focus to the
 * selected effort level once its popup is open.
 */
export function markOpenToEffort(trigger: HTMLElement): void {
  trigger.dataset.openToEffort = "true";
}

/** Reads and clears an open-to mark: effort from composer.effort, permissions from composer.mode. */
export function takeOpenTarget(trigger: HTMLElement | null): "effort" | "permissions" | null {
  if (trigger?.dataset.openToEffort) {
    delete trigger.dataset.openToEffort;
    return "effort";
  }
  if (trigger?.dataset.openToPermissions) {
    delete trigger.dataset.openToPermissions;
    return "permissions";
  }
  return null;
}
