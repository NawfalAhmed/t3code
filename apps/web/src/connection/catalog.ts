import { createEnvironmentCatalogAtoms } from "@t3tools/client-runtime/state/connections";
import { Atom } from "effect/reactivity";

import {
  applyEnvironmentDisplayNames,
  displayLinkOriginLabel,
  environmentDisplayNamesAtom,
} from "./environmentDisplayNames";
import { connectionAtomRuntime } from "./runtime";

const baseEnvironmentCatalog = createEnvironmentCatalogAtoms(connectionAtomRuntime);

/** The registry's own labels, before this device's display names. */
export const sourceEnvironmentCatalogValueAtom = baseEnvironmentCatalog.catalogValueAtom;

export const environmentCatalog = {
  ...baseEnvironmentCatalog,
  catalogValueAtom: Atom.make((get) =>
    applyEnvironmentDisplayNames(
      get(baseEnvironmentCatalog.catalogValueAtom),
      get(environmentDisplayNamesAtom),
    ),
  ).pipe(Atom.withLabel("web-environment-catalog-value")),
};

export const linkOriginLabelAtom = Atom.family((label: string) =>
  Atom.make((get) =>
    displayLinkOriginLabel(
      label,
      get(baseEnvironmentCatalog.catalogValueAtom),
      get(environmentDisplayNamesAtom),
    ),
  ),
);
