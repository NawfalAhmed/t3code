import { useAtomValue } from "@effect/atom-react";
import { Link } from "@tanstack/react-router";
import { ChartNoAxesColumnIcon } from "lucide-react";
import type { CSSProperties } from "react";

import { useNowMinute } from "../../hooks/useNowMinute";
import { cn } from "../../lib/utils";
import { environmentPresentations } from "../../state/presentation";
import { PROVIDER_ICON_BY_PROVIDER } from "../chat/ProviderInstanceIcon";
import { providerIconOpacity } from "../chat/providerIconOpacity";
import { ProviderPackageIcon } from "../chat/ProviderPackageIcon";
import { THREAD_DETAILS_PANEL_TEXT_CLASS } from "../chat/threadDetailsPanelStyles";
import { providerClients } from "../settings/providerDriverMeta";
import {
  type UsageLimitsSummaryEntry,
  resolveUsageLimitsSummary,
} from "./usageLimitsSummary.logic";

function entrySummary(entry: UsageLimitsSummaryEntry): string {
  const label = providerClients.get(entry.driver)?.label ?? String(entry.driver);
  const windows = entry.windows.map(
    (window) =>
      `${window.label} ${window.remainingPercent}% left${window.reset === null ? "" : `, resets ${window.reset}`}`,
  );
  return `${label}: ${windows.join(". ")}`;
}

/**
 * One provider's line, as `23% 3h 10m` and `Week: 20% 27 Sept`. Hidden from
 * assistive tech, which reads the whole link's summary instead.
 */
function UsageLine({ entry }: { readonly entry: UsageLimitsSummaryEntry }) {
  const packageIcon = providerClients.get(entry.driver)?.icon;
  const Icon = PROVIDER_ICON_BY_PROVIDER[entry.driver] ?? ChartNoAxesColumnIcon;
  return (
    <span
      aria-hidden
      className="flex w-full min-w-0 items-center gap-2 text-xs font-normal tabular-nums"
    >
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

const HEADING = "Usage limits";

/**
 * Subscription quota for every provider that reports it, as one link: the
 * lines are a single reading, not a menu, and all of them lead to the same
 * place. Usage → Limits is where the accounts behind a pooled figure live.
 */
export function UsageLimitsSummary() {
  const presentations = useAtomValue(environmentPresentations.presentationsWithProvidersAtom);
  const nowMinute = useNowMinute();
  const entries = resolveUsageLimitsSummary(presentations, Date.parse(`${nowMinute}:00.000Z`));
  if (entries.length === 0) {
    return null;
  }
  const summary = `${HEADING}. ${entries.map(entrySummary).join(". ")}`;
  return (
    <Link
      to="/usage"
      search={{ metric: "limits" }}
      className="group/usage-limits flex flex-1 flex-col justify-start gap-2.5 rounded-[inherit] px-4.5 py-4 text-muted-foreground/80 outline-hidden ring-ring hover:bg-black/[0.02] hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset dark:hover:bg-white/[0.045]"
    >
      <span className="sr-only">{summary}</span>
      <span
        aria-hidden
        className={cn(
          "mb-1 flex items-center gap-1 select-none",
          THREAD_DETAILS_PANEL_TEXT_CLASS,
          "font-normal group-hover/usage-limits:text-foreground",
        )}
      >
        {/* The glyph's ink stops short of its box, so a tighter gap reads like the rows' 8px. */}
        <ChartNoAxesColumnIcon className="size-4 shrink-0" />
        {HEADING}
      </span>
      {entries.map((entry) => (
        <UsageLine key={entry.driver} entry={entry} />
      ))}
    </Link>
  );
}
