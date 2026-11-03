import {
  BearerConnectionTarget,
  PrimaryConnectionTarget,
  RelayConnectionTarget,
  SshConnectionTarget,
  type ConnectionCatalogEntry,
  type ConnectionTarget,
} from "@t3tools/client-runtime/connection";
import type { EnvironmentCatalogState } from "@t3tools/client-runtime/state/connections";
import type { EnvironmentId } from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import { Atom } from "effect/reactivity";

import { getLocalStorageItem, setLocalStorageItem } from "../hooks/useLocalStorage";
import { appAtomRegistry } from "../rpc/atomRegistry";

const STORAGE_KEY = "t3code.environmentDisplayNames";
const DisplayNames = Schema.Record(Schema.String, Schema.String);
type DisplayNames = typeof DisplayNames.Type;

function readStoredDisplayNames(): DisplayNames {
  try {
    return getLocalStorageItem(STORAGE_KEY, DisplayNames) ?? {};
  } catch {
    return {};
  }
}

/** Device-local names that replace each environment's own label everywhere in this client. */
export const environmentDisplayNamesAtom = Atom.make<DisplayNames>(readStoredDisplayNames()).pipe(
  Atom.keepAlive,
  Atom.withLabel("web-environment-display-names"),
);

export function setEnvironmentDisplayName(environmentId: EnvironmentId, name: string | null) {
  const { [environmentId]: _previous, ...rest } = appAtomRegistry.get(environmentDisplayNamesAtom);
  const trimmed = name?.trim() ?? "";
  const next = trimmed === "" ? rest : { ...rest, [environmentId]: trimmed };
  appAtomRegistry.set(environmentDisplayNamesAtom, next);
  setLocalStorageItem(STORAGE_KEY, next, DisplayNames);
}

function relabelTarget(target: ConnectionTarget, label: string): ConnectionTarget {
  switch (target._tag) {
    case "PrimaryConnectionTarget":
      return new PrimaryConnectionTarget({ ...target, label });
    case "BearerConnectionTarget":
      return new BearerConnectionTarget({ ...target, label });
    case "RelayConnectionTarget":
      return new RelayConnectionTarget({ ...target, label });
    case "SshConnectionTarget":
      return new SshConnectionTarget({ ...target, label });
  }
}

// Presentation atoms skip work while an entry keeps its identity, so reuse each relabeled entry.
const relabeledEntries = new WeakMap<ConnectionCatalogEntry, ConnectionCatalogEntry>();

function relabelEntry(entry: ConnectionCatalogEntry, label: string): ConnectionCatalogEntry {
  const cached = relabeledEntries.get(entry);
  if (cached?.target.label === label) return cached;
  const relabeled = { ...entry, target: relabelTarget(entry.target, label) };
  relabeledEntries.set(entry, relabeled);
  return relabeled;
}

export function applyEnvironmentDisplayNames(
  catalog: EnvironmentCatalogState,
  names: DisplayNames,
): EnvironmentCatalogState {
  let entries: Map<EnvironmentId, ConnectionCatalogEntry> | null = null;
  for (const [environmentId, entry] of catalog.entries) {
    const name = names[environmentId];
    if (name === undefined || name === entry.target.label) continue;
    entries ??= new Map(catalog.entries);
    entries.set(environmentId, relabelEntry(entry, name));
  }
  return entries === null ? catalog : { ...catalog, entries };
}

// Matches the session label PeerLinks.link signs in with on the other environment.
const LINK_SESSION_PREFIX = "T3 Code · ";

/** A link session carries the linking machine's own name from sign-in; show this device's name for it. */
export function displayLinkOriginLabel(
  label: string,
  catalog: EnvironmentCatalogState,
  names: DisplayNames,
): string {
  if (!label.startsWith(LINK_SESSION_PREFIX)) return label;
  const machine = label.slice(LINK_SESSION_PREFIX.length);
  for (const [environmentId, entry] of catalog.entries) {
    const name = names[environmentId];
    if (name !== undefined && entry.target.label === machine) {
      return `${LINK_SESSION_PREFIX}${name}`;
    }
  }
  return label;
}
