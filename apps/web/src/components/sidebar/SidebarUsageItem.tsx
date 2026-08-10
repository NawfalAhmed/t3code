import { useAtomValue } from "@effect/atom-react";
import { ChartNoAxesColumnIcon } from "lucide-react";
import { useMemo } from "react";

import { environmentPresentations } from "../../state/presentation";
import { getDriverOption } from "../settings/providerDriverMeta";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import { type SidebarUsageEntry, resolveSidebarUsage } from "./sidebarUsage";

function entrySummary(entry: SidebarUsageEntry): string {
  const label = getDriverOption(entry.driver)?.label ?? String(entry.driver);
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
  const Icon = getDriverOption(entry.driver)?.icon ?? ChartNoAxesColumnIcon;
  return (
    <span
      aria-hidden
      className="flex w-full min-w-0 items-center gap-2 text-xs font-normal tabular-nums"
    >
      {/* Wrapped so the button's `[&>svg]` rule cannot repaint it in the
          contrast-boosted icon colour. */}
      <span className="inline-flex shrink-0 items-center opacity-60">
        <Icon className="size-3.5" />
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
  const presentations = useAtomValue(environmentPresentations.presentationsAtom);
  // Recomputed only when the snapshots change; the countdowns read against the
  // provider's own checkedAt, so they need no clock of their own here.
  const entries = useMemo(() => resolveSidebarUsage(presentations), [presentations]);
  if (entries.length === 0) {
    return null;
  }
  const summary = `${HEADING}. ${entries.map(entrySummary).join(". ")}`;
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={onSelect}
          tooltip={summary}
          className="h-auto flex-col items-stretch gap-2.5 py-2"
        >
          <span className="sr-only">{summary}</span>
          <span aria-hidden className="text-xs font-semibold">
            {HEADING}
          </span>
          {entries.map((entry) => (
            <UsageLine key={entry.driver} entry={entry} />
          ))}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
