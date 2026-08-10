import { createFileRoute } from "@tanstack/react-router";

import { UsagePage, isUsageMetric } from "../components/usage/UsagePage";
import type { UsageMetric } from "../components/usage/usageShortcuts";

/** Absent, the page opens on the stored preference. */
export interface UsageSearch {
  readonly metric?: UsageMetric;
}

export const Route = createFileRoute("/_chat/usage")({
  validateSearch: (raw: Record<string, unknown>): UsageSearch =>
    isUsageMetric(raw.metric) ? { metric: raw.metric } : {},
  component: UsagePage,
});
