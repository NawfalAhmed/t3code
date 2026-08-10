import { createFileRoute } from "@tanstack/react-router";

import { UsagePage, isUsageMetric, type UsageMetric } from "../components/usage/UsagePage";

/** Absent, the page opens on the stored preference. */
export interface UsageSearch {
  readonly metric?: UsageMetric;
}

export const Route = createFileRoute("/usage")({
  validateSearch: (raw: Record<string, unknown>): UsageSearch =>
    isUsageMetric(raw.metric) ? { metric: raw.metric } : {},
  component: UsagePage,
});
