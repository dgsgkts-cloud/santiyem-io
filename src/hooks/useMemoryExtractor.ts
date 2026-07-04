import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MemoryCategory =
  | "company" | "project" | "supplier" | "customer" | "personnel"
  | "decision" | "preference" | "workflow" | "finance" | "safety";

export interface MemoryProposal {
  title: string;
  content: string;
  type: string;
  category: MemoryCategory;
  confidence: number;
}

export function useMemoryExtractor() {
  const [proposals, setProposals] = useState<MemoryProposal[]>([]);
  const [busy, setBusy] = useState(false);

  const extractFromTurn = useCallback(
    async (userText: string, assistantText: string) => {
      if (!userText || !assistantText) return;
      try {
        const { data, error } = await supabase.functions.invoke("extract-memories", {
          body: { userText, assistantText },
        });
        if (error) return;
        const next = (data?.proposals ?? []) as MemoryProposal[];
        if (next.length) {
          // Append new proposals but cap the visible queue at 3
          setProposals((prev) => [...prev, ...next].slice(0, 3));
        }
      } catch (e) {
        // Extraction is best-effort — never break the chat
        console.error("[memory-extractor] failed", e);
      }
    },
    [],
  );

  const remember = useCallback(async (p: MemoryProposal) => {
    setBusy(true);
    try {
      await supabase.functions.invoke("company-memory", {
        body: {
          action: "upsert",
          title: p.title,
          content: p.content,
          type: p.type,
          category: p.category,
          confidence: p.confidence,
          source: "auto-extract",
          created_from: "chat",
          user_confirmed: true,
        },
      });
      setProposals((prev) => prev.filter((x) => x !== p));
    } finally {
      setBusy(false);
    }
  }, []);

  const dismiss = useCallback((p: MemoryProposal) => {
    setProposals((prev) => prev.filter((x) => x !== p));
  }, []);

  const neverAgain = useCallback(async (p: MemoryProposal) => {
    setBusy(true);
    try {
      await supabase.functions.invoke("company-memory", {
        body: { action: "dismiss_category", category: p.category },
      });
      setProposals((prev) => prev.filter((x) => x.category !== p.category));
    } finally {
      setBusy(false);
    }
  }, []);

  return { proposals, busy, extractFromTurn, remember, dismiss, neverAgain };
}
