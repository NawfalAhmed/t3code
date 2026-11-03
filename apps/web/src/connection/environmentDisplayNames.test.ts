import { BearerConnectionTarget, RelayConnectionTarget } from "@t3tools/client-runtime/connection";
import { EnvironmentId } from "@t3tools/contracts";
import * as Option from "effect/Option";
import { describe, expect, it } from "vite-plus/test";

import { applyEnvironmentDisplayNames, displayLinkOriginLabel } from "./environmentDisplayNames";

const laptop = EnvironmentId.make("laptop");
const server = EnvironmentId.make("server");
const catalog = {
  isReady: true,
  entries: new Map([
    [
      laptop,
      {
        target: new BearerConnectionTarget({
          environmentId: laptop,
          label: "nawfal-mbp",
          connectionId: "c1",
        }),
        profile: Option.none(),
        enabled: true,
      },
    ],
    [
      server,
      {
        target: new RelayConnectionTarget({ environmentId: server, label: "ubuntu-01" }),
        profile: Option.none(),
        enabled: true,
      },
    ],
  ]),
};

describe("applyEnvironmentDisplayNames", () => {
  it("returns the catalog untouched without a matching name", () => {
    expect(applyEnvironmentDisplayNames(catalog, {})).toBe(catalog);
    expect(applyEnvironmentDisplayNames(catalog, { [laptop]: "nawfal-mbp" })).toBe(catalog);
  });

  it("relabels only named entries, keeping the target class and the entry identity", () => {
    const first = applyEnvironmentDisplayNames(catalog, { [server]: "Build box" });
    const target = first.entries.get(server)!.target;
    expect(target).toBeInstanceOf(RelayConnectionTarget);
    expect(target.label).toBe("Build box");
    expect(first.entries.get(laptop)).toBe(catalog.entries.get(laptop));

    const again = applyEnvironmentDisplayNames(catalog, { [server]: "Build box" });
    expect(again.entries.get(server)).toBe(first.entries.get(server));
  });
});

describe("displayLinkOriginLabel", () => {
  it("shows a renamed machine's name for the link session it signed in with", () => {
    const names = { [laptop]: "Work Mac" };
    expect(displayLinkOriginLabel("T3 Code · nawfal-mbp", catalog, names)).toBe(
      "T3 Code · Work Mac",
    );
    expect(displayLinkOriginLabel("T3 Code · ubuntu-01", catalog, names)).toBe(
      "T3 Code · ubuntu-01",
    );
    expect(displayLinkOriginLabel("nawfal-mbp", catalog, names)).toBe("nawfal-mbp");
  });
});
