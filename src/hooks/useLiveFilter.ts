// useLiveFilter — subscribe a list page to AI-driven filtering.
// The AI Canvas may publish { type:"filter", kind, ids } after a turn.
// The list narrows to those ids until user clicks "Temizle".

import { useEffect, useState } from "react";
import { workspaceBus, type EntityKind } from "@/lib/workspaceBus";

export type LiveFilter = {
  active: boolean;
  ids: Set<string>;
  label?: string;
  clear: () => void;
};

export const useLiveFilter = (kind: EntityKind): LiveFilter => {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [label, setLabel] = useState<string | undefined>();

  useEffect(() => {
    return workspaceBus.subscribe((e) => {
      if (e.type === "filter" && e.kind === kind) {
        setIds(new Set(e.ids));
        setLabel(e.label);
      } else if (e.type === "filter-clear" && e.kind === kind) {
        setIds(new Set());
        setLabel(undefined);
      }
    });
  }, [kind]);

  return {
    active: ids.size > 0,
    ids,
    label,
    clear: () => {
      setIds(new Set());
      setLabel(undefined);
      workspaceBus.publish({ type: "filter-clear", kind });
    },
  };
};
