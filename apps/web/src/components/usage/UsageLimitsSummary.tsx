import { useAtomValue } from "@effect/atom-react";
import { Link } from "@tanstack/react-router";
import { ChartNoAxesColumnIcon, TicketIcon } from "lucide-react";
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
  if (entry.resetCredits !== null) windows.push(`${entry.resetCredits} banked resets`);
  return `${label}: ${windows.join(". ")}`;
}

const KIND_ORDER = ["session", "weekly", "monthly", "other"] as const;

/** One provider's row of the grid, a cell per column, as `23% 3h 10m`. */
function UsageLine({
  entry,
  kinds,
  showResetCredits,
}: {
  readonly entry: UsageLimitsSummaryEntry;
  readonly kinds: readonly string[];
  readonly showResetCredits: boolean;
}) {
  const packageIcon = providerClients.get(entry.driver)?.icon;
  const Icon = PROVIDER_ICON_BY_PROVIDER[entry.driver] ?? ChartNoAxesColumnIcon;
  return (
    <span className="contents">
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
      {kinds.map((kind) => {
        const window = entry.windows.find((candidate) => candidate.kind === kind);
        if (!window) return <span key={kind} />;
        const left = window.remainingPercent;
        return (
          <span key={kind} className="flex min-w-0 items-baseline justify-center gap-1">
            {/* Status colours hold steady: the row's muted rest dulls them and its hover glares. */}
            <span
              className={cn(
                left <= 10
                  ? "text-error-foreground/80"
                  : left <= 20 && "text-warning-foreground/80",
              )}
            >
              {left}%
            </span>
            {window.reset === null ? null : (
              <span className={cn(window.resetSoon && "text-info-foreground/80")}>
                {window.reset}
              </span>
            )}
          </span>
        );
      })}
      {showResetCredits ? <span className="text-center">{entry.resetCredits || "-"}</span> : null}
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
  const columns = KIND_ORDER.flatMap(
    (kind) =>
      entries.flatMap((entry) => entry.windows).find((window) => window.kind === kind) ?? [],
  );
  const kinds = columns.map((window) => window.kind);
  const showResetCredits = entries.some((entry) => entry.resetCredits !== null);
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
      {/* Hidden from assistive tech, which reads the link's summary instead. */}
      <span
        aria-hidden
        className="grid items-center gap-x-2 gap-y-2.5 text-xs font-normal tabular-nums"
        style={{
          gridTemplateColumns: `auto repeat(${kinds.length}, minmax(0, 1fr))${showResetCredits ? " auto" : ""}`,
        }}
      >
        <span />
        {columns.map((window) => (
          <span
            key={window.kind}
            className="truncate text-center font-semibold text-muted-foreground group-hover/usage-limits:text-foreground"
          >
            {window.prefix}
          </span>
        ))}
        {showResetCredits ? (
          <TicketIcon className="size-3.5 justify-self-center text-muted-foreground group-hover/usage-limits:text-foreground" />
        ) : null}
        <span className="col-span-full h-px bg-foreground/10" />
        {entries.map((entry) => (
          <UsageLine
            key={entry.driver}
            entry={entry}
            kinds={kinds}
            showResetCredits={showResetCredits}
          />
        ))}
      </span>
    </Link>
  );
}
