// useSmartNavigation — global listener that opens tabs on high-confidence
// navigate events. Mount once at the app shell (or Index). Uses the existing
// `navigate-tab` CustomEvent bus, so no router changes are needed.

import { useEffect } from "react";
import { workspaceBus, type EntityKind } from "@/lib/workspaceBus";

const KIND_TO_TAB: Record<EntityKind, string> = {
  project: "projects",
  personnel: "personnel",
  supplier: "projects",
  material: "materials",
  task: "dashboard",
  payment: "payments-kasa",
  document: "daily",
};

export const useSmartNavigation = () => {
  useEffect(() => {
    return workspaceBus.subscribe((e) => {
      if (e.type !== "navigate") return;
      if (e.confidence !== "high") return;
      const tab = KIND_TO_TAB[e.ref.kind];
      if (!tab) return;
      window.dispatchEvent(new CustomEvent("navigate-tab", { detail: tab }));
    });
  }, []);
};
