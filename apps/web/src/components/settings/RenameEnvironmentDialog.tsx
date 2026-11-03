import { useAtomValue } from "@effect/atom-react";
import type { EnvironmentId } from "@t3tools/contracts";
import { useState } from "react";

import { sourceEnvironmentCatalogValueAtom } from "../../connection/catalog";
import {
  environmentDisplayNamesAtom,
  setEnvironmentDisplayName,
} from "../../connection/environmentDisplayNames";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";

export function RenameEnvironmentDialog({
  environmentId,
  open,
  onOpenChange,
}: {
  readonly environmentId: EnvironmentId;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md">
        <RenameEnvironmentForm environmentId={environmentId} onDone={() => onOpenChange(false)} />
      </DialogPopup>
    </Dialog>
  );
}

function RenameEnvironmentForm({
  environmentId,
  onDone,
}: {
  readonly environmentId: EnvironmentId;
  readonly onDone: () => void;
}) {
  const originalName =
    useAtomValue(sourceEnvironmentCatalogValueAtom).entries.get(environmentId)?.target.label ?? "";
  const displayName = useAtomValue(environmentDisplayNamesAtom)[environmentId];
  const [name, setName] = useState(displayName ?? originalName);

  const save = (next: string | null) => {
    const trimmed = next?.trim() ?? "";
    setEnvironmentDisplayName(environmentId, trimmed === originalName ? null : trimmed);
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Rename machine</DialogTitle>
        <DialogDescription>
          Only changes how {originalName || "this machine"} appears on this device. Leave it blank
          to use the machine's own name.
        </DialogDescription>
      </DialogHeader>
      <DialogPanel>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save(name);
          }}
        >
          <Input
            aria-label="Display name"
            placeholder={originalName}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </form>
      </DialogPanel>
      <DialogFooter variant="bare">
        {displayName !== undefined ? (
          <div className="sm:mr-auto">
            <Button variant="ghost" onClick={() => save(null)}>
              Use original name
            </Button>
          </div>
        ) : null}
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={() => save(name)}>Save</Button>
      </DialogFooter>
    </>
  );
}
