// useCanvasTurns — a tiny global store for AI Canvas turns.
// Both the chat pipeline and voice pipeline can push a completed assistant
// turn here; the Canvas UI subscribes and renders the latest one plus
// history. Purely additive: no chat/voice logic depends on this store.

import { useSyncExternalStore } from "react";
import type { AIUiPayload } from "@/components/ai/AIResponseRenderer";
import { parseAIResponse } from "@/hooks/useAIResponse";

export type CanvasStatus =
  | "idle"
  | "listening"
  | "understanding"
  | "searching"
  | "reading-memory"
  | "reading-knowledge"
  | "calculating"
  | "preparing"
  | "speaking"
  | "completed"
  | "error";

export type CanvasTurn = {
  id: string;
  createdAt: number;
  question: string;
  speech: string;
  ui: AIUiPayload[];
  status: CanvasStatus;
  source: "chat" | "voice";
  // Optional metadata used by CanvasHeader / SourcePanel — assistant
  // responses may pass these through when available (all optional).
  meta?: {
    title?: string;
    project?: string;
    dateRange?: string;
    recordsAnalysed?: number;
    sources?: { label: string; count?: number; kind?: string }[];
    followups?: string[];
  };
};

type State = {
  turns: CanvasTurn[];
  status: CanvasStatus;
  activeSource: "chat" | "voice" | null;
};

let state: State = { turns: [], status: "idle", activeSource: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const setState = (patch: Partial<State> | ((s: State) => Partial<State>)) => {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  emit();
};

export const canvasStore = {
  setStatus(status: CanvasStatus, source?: "chat" | "voice") {
    setState({ status, activeSource: source ?? state.activeSource });
  },
  beginTurn(question: string, source: "chat" | "voice") {
    setState({ status: "understanding", activeSource: source });
    return { question, source } as const;
  },
  pushTurn(input: {
    question: string;
    raw: string;
    source: "chat" | "voice";
    meta?: CanvasTurn["meta"];
  }) {
    const parsed = parseAIResponse(input.raw);
    const turn: CanvasTurn = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      question: input.question,
      speech: parsed.speech,
      ui: parsed.ui,
      status: "completed",
      source: input.source,
      meta: input.meta,
    };
    setState((s) => ({
      turns: [...s.turns, turn].slice(-40),
      status: "completed",
      activeSource: input.source,
    }));
    return turn;
  },
  clear() {
    setState({ turns: [], status: "idle", activeSource: null });
  },
  get snapshot() {
    return state;
  },
};

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const getSnapshot = () => state;

export const useCanvasTurns = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
