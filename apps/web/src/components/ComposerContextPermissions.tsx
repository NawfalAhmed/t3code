import type { RuntimeMode } from "@t3tools/contracts";
import { useAtomValue } from "@effect/atom-react";
import { useRef } from "react";

import { shortcutLabelForCommand } from "../keybindings";
import { primaryServerKeybindingsAtom } from "../state/server";
import { ComposerControl } from "./chat/ComposerControl";
import { ComposerPermissionsSection, type RuntimeModeOption } from "./chat/ComposerFooterControls";
import { focusRequestedPermission, useComposerMenuProps } from "./chat/composerEventScope";
import { runtimeModeConfig } from "./chat/runtimeModeConfig";
import { ComposerContextLabel } from "./ComposerContextLabel";
import { Menu, MenuPopup, MenuTrigger } from "./ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";

export function ComposerContextPermissions(props: {
  runtimeMode: RuntimeMode;
  runtimeModeOptions: ReadonlyArray<RuntimeModeOption>;
  onRuntimeModeChange: (mode: RuntimeMode) => void;
  disabled?: boolean;
}) {
  const shortcutLabel = shortcutLabelForCommand(
    useAtomValue(primaryServerKeybindingsAtom),
    "composer.mode",
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const floatingLayerProps = useComposerMenuProps();
  const { icon: Icon, label } = runtimeModeConfig[props.runtimeMode];
  return (
    <Menu onOpenChangeComplete={(open) => focusRequestedPermission(open, triggerRef.current)}>
      <Tooltip>
        <TooltipTrigger
          render={
            <MenuTrigger
              render={
                <ComposerControl
                  ref={triggerRef}
                  size="xs"
                  className="ms-auto min-w-0 shrink-0"
                  aria-label={`Permissions: ${label}`}
                  data-composer-context-control
                  data-composer-shortcut="composer.mode"
                  disabled={props.disabled}
                />
              }
            />
          }
        >
          <Icon aria-hidden="true" className="size-3" />
          <ComposerContextLabel>{label}</ComposerContextLabel>
        </TooltipTrigger>
        <TooltipPopup>Permissions{shortcutLabel ? ` · ${shortcutLabel}` : null}</TooltipPopup>
      </Tooltip>
      <MenuPopup align="end" {...floatingLayerProps}>
        <ComposerPermissionsSection
          runtimeMode={props.runtimeMode}
          runtimeModeOptions={props.runtimeModeOptions}
          onRuntimeModeChange={props.onRuntimeModeChange}
        />
      </MenuPopup>
    </Menu>
  );
}
