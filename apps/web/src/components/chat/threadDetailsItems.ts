import type { ClientSettings } from "@t3tools/contracts";

// Ids are stored in client settings, so never rename one.
export const THREAD_DETAILS_ITEMS = [
  { id: "environment", label: "Environment and worktree", defaultVisible: true },
  { id: "openIn", label: "Open in editor", defaultVisible: true },
  { id: "scripts", label: "Project scripts", defaultVisible: true },
  { id: "branch", label: "Branch and pull request", defaultVisible: true },
  { id: "gitActions", label: "Git actions", defaultVisible: true },
  { id: "changes", label: "Changes", defaultVisible: true },
  { id: "servers", label: "Servers", defaultVisible: true },
  { id: "automations", label: "Automations", defaultVisible: true },
  { id: "lineage", label: "Lineage", defaultVisible: true },
  { id: "usage", label: "Usage", defaultVisible: false },
  { id: "context", label: "Context", defaultVisible: false },
] as const;

export type ThreadDetailsItemId = (typeof THREAD_DETAILS_ITEMS)[number]["id"];
export type ThreadDetailsVisibility = Readonly<Record<ThreadDetailsItemId, boolean>>;

type ThreadDetailsItem = (typeof THREAD_DETAILS_ITEMS)[number];
type ThreadDetailsItemSettings = Pick<
  ClientSettings,
  "threadDetailsItems" | "threadDetailsUsageEnabled"
>;

// People who turned on the retired Labs toggle keep Usage until they change it here.
function defaultVisible(item: ThreadDetailsItem, settings: ThreadDetailsItemSettings) {
  if (item.id === "context")
    return settings.threadDetailsItems.usage ?? settings.threadDetailsUsageEnabled;
  return item.id === "usage" ? settings.threadDetailsUsageEnabled : item.defaultVisible;
}

export function resolveThreadDetailsVisibility(
  settings: ThreadDetailsItemSettings,
): ThreadDetailsVisibility {
  return Object.fromEntries(
    THREAD_DETAILS_ITEMS.map((item) => [
      item.id,
      settings.threadDetailsItems[item.id] ?? defaultVisible(item, settings),
    ]),
  ) as Record<ThreadDetailsItemId, boolean>;
}

/** Keeps the former combined preference until Context is chosen independently. */
export function setThreadDetailsItem(
  settings: ThreadDetailsItemSettings,
  item: ThreadDetailsItem,
  visible: boolean,
): ClientSettings["threadDetailsItems"] {
  const { [item.id]: _previous, ...rest } = settings.threadDetailsItems;
  const next = visible === defaultVisible(item, settings) ? rest : { ...rest, [item.id]: visible };
  return item.id === "usage"
    ? { ...next, context: resolveThreadDetailsVisibility(settings).context }
    : next;
}

export function isDefaultThreadDetailsVisibility(visibility: ThreadDetailsVisibility) {
  return THREAD_DETAILS_ITEMS.every((item) => visibility[item.id] === item.defaultVisible);
}

/** Also clears the retired Labs flag, so Usage and Context return to off. */
export const RESET_THREAD_DETAILS_ITEMS = {
  threadDetailsItems: {},
  threadDetailsUsageEnabled: false,
} satisfies Partial<ClientSettings>;
