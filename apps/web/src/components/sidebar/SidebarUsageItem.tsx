import { useAtomValue } from "@effect/atom-react";
import { ChartNoAxesColumnIcon } from "lucide-react";
import type { CSSProperties } from "react";

import { environmentPresentations } from "../../state/presentation";
import { PROVIDER_ICON_BY_PROVIDER } from "../chat/ProviderInstanceIcon";
import { providerIconOpacity } from "../chat/providerIconOpacity";
import { ProviderPackageIcon } from "../chat/ProviderPackageIcon";
import { providerClients } from "../settings/providerDriverMeta";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import { type SidebarUsageEntry, resolveSidebarUsage } from "./sidebarUsage";

function entrySummary(entry: SidebarUsageEntry): string {
  const label = providerClients.get(entry.driver)?.label ?? String(entry.driver);
  const windows = entry.windows.map(
    (window) =>
      `${window.label} ${window.remainingPercent}% left${window.reset === null ? "" : `, resets ${window.reset}`}`,
  );
  return `${label}: ${windows.join(". ")}`;
}

/**
 * One provider's line, as `23% 3h 10m` and `Week: 20% 27 Sept`. Hidden from
 * assistive tech, which reads the whole item's summary instead.
 */
function UsageLine({ entry }: { readonly entry: SidebarUsageEntry }) {
  const packageIcon = providerClients.get(entry.driver)?.icon;
  const Icon = PROVIDER_ICON_BY_PROVIDER[entry.driver] ?? ChartNoAxesColumnIcon;
  return (
    <span
      aria-hidden
      className="flex w-full min-w-0 items-center gap-2 text-xs font-normal tabular-nums"
    >
      {/* Wrapped so the button's `[&>svg]` rule cannot repaint it in the
          contrast-boosted icon colour. */}
      <span
        className="inline-flex shrink-0 items-center opacity-(--provider-icon-default-opacity) transition-opacity duration-150 group-hover/usage-limits:opacity-(--provider-icon-active-opacity) motion-reduce:transition-none"
        style={
          {
            "--provider-icon-default-opacity": providerIconOpacity(entry.driver),
            "--provider-icon-active-opacity": providerIconOpacity(entry.driver, "active"),
          } as CSSProperties
        }
      >
        {packageIcon ? (
          <ProviderPackageIcon icon={packageIcon} className="size-3.5" />
        ) : (
          <Icon className="size-3.5" />
        )}
      </span>
      <span className="flex w-full min-w-0 items-center justify-between gap-1.5">
        {entry.windows.map((window) => (
          <span key={window.id} className="flex shrink-0 items-baseline gap-1">
            {window.prefix === null ? null : (
              <span className="font-semibold">{window.prefix}:</span>
            )}
            <span>{window.remainingPercent}%</span>
            {window.reset === null ? null : <span>{window.reset}</span>}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Named apart from the Usage control beside it, which means costs. */
const HEADING = "Usage limits";

/**
 * Subscription quota for every provider that reports it, as one control: the
 * lines are a single reading, not a menu, and all of them lead to the same
 * place. Usage → Limits is where the accounts behind a pooled figure live.
 */
export function SidebarUsageItem({ onSelect }: { readonly onSelect: () => void }) {
  const presentations = useAtomValue(environmentPresentations.presentationsWithProvidersAtom);
  // The countdowns read against the provider's own checkedAt, so they need no
  // clock of their own here.
  const entries = resolveSidebarUsage(presentations);
  if (entries.length === 0) {
    return null;
  }
  const summary = `${HEADING}. ${entries.map(entrySummary).join(". ")}`;
  return (
    <div className="border-y border-sidebar-border/60 py-1">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={onSelect}
            tooltip={summary}
            className="group/usage-limits h-auto flex-col items-stretch"
          >
            <span className="sr-only">{summary}</span>
            <span className="flex w-full min-w-0 flex-col gap-2.5 py-1.5">
              <span aria-hidden className="text-xs font-semibold">
                {HEADING}
              </span>
              {entries.map((entry) => (
                <UsageLine key={entry.driver} entry={entry} />
              ))}
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
}
