// TEMP(personal): diagnoses the provider warning seen right after app start. Delete once found.
import type { ServerProvider } from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Schema from "effect/Schema";

const MAX_BYTES = 5 * 1024 * 1024;
const encodeLine = Schema.encodeUnknownEffect(Schema.fromJsonString(Schema.Unknown));
const PLACEHOLDER_MESSAGE = "has not been checked in this session yet";

let registryStartedAtMs = 0;
let sink: { readonly path: string; readonly fileSystem: FileSystem.FileSystem } | null = null;
let sequence = 0;
let clientSubscriptions = 0;
const lastLoggedByInstance = new Map<string, string>();

function summarize(provider: ServerProvider) {
  const usage = provider.usageLimits;
  return {
    instanceId: provider.instanceId,
    driver: provider.driver,
    displayName: provider.displayName ?? null,
    enabled: provider.enabled,
    installed: provider.installed,
    version: provider.version,
    status: provider.status,
    authStatus: provider.auth.status,
    authType: provider.auth.type ?? null,
    message: provider.message ?? null,
    isPendingPlaceholder: provider.message?.includes(PLACEHOLDER_MESSAGE) ?? false,
    // Approximates getProviderStatusBannerKey in apps/web ProviderStatusBanner.tsx.
    likelyShowsBanner:
      provider.enabled &&
      provider.status !== "ready" &&
      provider.status !== "disabled" &&
      !(
        provider.driver === "antigravity" &&
        provider.status === "warning" &&
        provider.auth.status === "unknown"
      ),
    compatibility: provider.compatibilityAdvisory?.status ?? null,
    compatibilityMessage: provider.compatibilityAdvisory?.message ?? null,
    modelCount: provider.models.length,
    checkedAt: provider.checkedAt,
    usage:
      usage === undefined
        ? null
        : {
            checkedAt: usage.checkedAt,
            windowCount: usage.windows.length,
            unavailableReason: usage.unavailable?.reason ?? null,
            unavailableMessage: usage.unavailable?.message ?? null,
          },
  };
}

// Timestamps change on every probe; only a change in what the user sees is worth a line.
function changeKey(summary: ReturnType<typeof summarize>): string {
  const { checkedAt: _checkedAt, usage, ...rest } = summary;
  return JSON.stringify({
    ...rest,
    usageUnavailable: usage?.unavailableReason ?? null,
    usageUnavailableMessage: usage?.unavailableMessage ?? null,
    usageWindows: usage?.windowCount ?? null,
  });
}

const append = Effect.fnUntraced(function* (record: Record<string, unknown>) {
  if (sink === null) return;
  const { path, fileSystem } = sink;
  const size = yield* fileSystem.stat(path).pipe(
    Effect.map((info) => Number(info.size)),
    Effect.orElseSucceed(() => 0),
  );
  if (size > MAX_BYTES) return;
  const now = yield* DateTime.now;
  const line = yield* encodeLine({
    at: DateTime.formatIso(now),
    msSinceRegistryStart: DateTime.toEpochMillis(now) - registryStartedAtMs,
    processUptimeMs: Math.round(process.uptime() * 1_000),
    pid: process.pid,
    seq: sequence++,
    ...record,
  });
  yield* fileSystem.writeFileString(path, `${line}\n`, { flag: "a" });
});

export const startProviderStatusDebugLog = Effect.fnUntraced(
  function* (input: {
    readonly path: string;
    readonly fileSystem: FileSystem.FileSystem;
    readonly bootProviders: ReadonlyArray<ServerProvider>;
    readonly bootInstanceIds: ReadonlyArray<string>;
  }) {
    sink = { path: input.path, fileSystem: input.fileSystem };
    registryStartedAtMs = DateTime.toEpochMillis(yield* DateTime.now);
    const providers = input.bootProviders.map(summarize);
    for (const summary of providers) {
      lastLoggedByInstance.set(summary.instanceId, changeKey(summary));
    }
    yield* append({
      event: "registry-boot",
      note: "Providers clients see before any probe; these come from the on-disk status cache.",
      configuredInstanceIds: input.bootInstanceIds,
      missingFromCache: input.bootInstanceIds.filter(
        (id) => !providers.some((summary) => summary.instanceId === id),
      ),
      providers,
    });
  },
  Effect.ignoreCause({ log: true }),
);

export const logProviderStatusPublish = Effect.fnUntraced(
  function* (providers: ReadonlyArray<ServerProvider>) {
    const changed = providers.flatMap((provider) => {
      const summary = summarize(provider);
      const key = changeKey(summary);
      const previousKey = lastLoggedByInstance.get(summary.instanceId);
      if (previousKey === key) return [];
      lastLoggedByInstance.set(summary.instanceId, key);
      return [{ ...summary, previous: previousKey === undefined ? null : JSON.parse(previousKey) }];
    });
    if (changed.length === 0) return;
    yield* append({ event: "registry-publish", changed });
  },
  Effect.ignoreCause({ log: true }),
);

export const logProviderStatusClientSeed = Effect.fnUntraced(
  function* (providers: ReadonlyArray<ServerProvider>) {
    yield* append({
      event: "client-seed",
      note: "First provider list a newly subscribed client receives.",
      clientSubscription: ++clientSubscriptions,
      providers: providers.map(summarize),
    });
  },
  Effect.ignoreCause({ log: true }),
);
