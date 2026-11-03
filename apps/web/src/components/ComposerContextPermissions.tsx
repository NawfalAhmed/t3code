import type { EnvironmentId, RuntimeMode } from "@t3tools/contracts";
import { useAtomValue } from "@effect/atom-react";
import { useRef } from "react";

import { shortcutLabelForCommand } from "../keybindings";
import { useManagedPolicy } from "../state/managedPolicy";
import { primaryServerKeybindingsAtom } from "../state/server";
import { ComposerControl } from "./chat/ComposerControl";
import { ComposerPermissionsSection } from "./chat/ComposerFooterControls";
import { focusRequestedPermission, useComposerMenuProps } from "./chat/composerEventScope";
import {
  resolveCompatibleRuntimeMode,
  resolveRuntimeModeOptions,
  runtimeModeConfig,
} from "./chat/runtimeModeConfig";
import { ComposerContextLabel } from "./ComposerContextLabel";
import { Menu, MenuPopup, MenuTrigger } from "./ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";

export function ComposerContextPermissions(props: {
  environmentId: EnvironmentId | null;
  runtimeMode: RuntimeMode;
  supportedRuntimeModes: ReadonlyArray<RuntimeMode> | undefined;
  onRuntimeModeChange: (mode: RuntimeMode) => void;
  disabled?: boolean;
}) {
  const shortcutLabel = shortcutLabelForCommand(
    useAtomValue(primaryServerKeybindingsAtom),
    "composer.mode",
  );
  const { mode, modes } = resolveCompatibleRuntimeMode(
    props.runtimeMode,
    props.supportedRuntimeModes,
  );
  const options = resolveRuntimeModeOptions(modes, useManagedPolicy(props.environmentId));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const composerMenuProps = useComposerMenuProps();
  const { icon: Icon, label } = runtimeModeConfig[mode];
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
      <MenuPopup side="top" align="end" {...composerMenuProps}>
        <ComposerPermissionsSection
          runtimeMode={mode}
          runtimeModeOptions={options}
          onRuntimeModeChange={props.onRuntimeModeChange}
        />
      </MenuPopup>
    </Menu>
  );
}
