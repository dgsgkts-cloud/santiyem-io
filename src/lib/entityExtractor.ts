// entityExtractor — passive scan of an assistant response for entity refs.
// Never mutates the response. Reads from three sources the brains already
// return today: ui[*].meta.entities, sources[*], and inline id:xxxx markers.

import type { AIUiPayload } from "@/components/ai/AIResponseRenderer";
import type { EntityKind, EntityRef } from "@/lib/workspaceBus";

const KIND_MAP: Record<string, EntityKind> = {
  project: "project",
  projects: "project",
  proje: "project",
  personnel: "personnel",
  worker: "personnel",
  personel: "personnel",
  supplier: "supplier",
  subcontractor: "supplier",
  taşeron: "supplier",
  material: "material",
  malzeme: "material",
  task: "task",
  görev: "task",
  payment: "payment",
  ödeme: "payment",
  cash: "payment",
  document: "document",
  doc: "document",
  belge: "document",
};

const normKind = (raw: string): EntityKind | null => {
  const k = raw.toLowerCase().trim();
  return KIND_MAP[k] ?? null;
};

const pushRef = (out: EntityRef[], ref: EntityRef | null) => {
  if (!ref?.id || !ref.kind) return;
  if (out.some((r) => r.kind === ref.kind && r.id === ref.id)) return;
  out.push(ref);
};

// UUID or short id token pattern (defensive; brains may emit different shapes)
const ID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export const extractEntities = (input: {
  ui: AIUiPayload[];
  speech: string;
  meta?: { sources?: { label?: string; kind?: string; id?: string; count?: number }[] };
}): EntityRef[] => {
  const out: EntityRef[] = [];

  // 1) ui[*].meta.entities
  for (const p of input.ui) {
    const list = (p as any)?.meta?.entities;
    if (Array.isArray(list)) {
      for (const e of list) {
        const kind = normKind(String(e?.kind ?? ""));
        if (kind && e?.id) pushRef(out, { kind, id: String(e.id), label: e?.label });
      }
    }
  }

  // 2) sources[*] with explicit kind + id
  for (const s of input.meta?.sources ?? []) {
    const kind = normKind(String(s?.kind ?? s?.label ?? ""));
    if (kind && s?.id) pushRef(out, { kind, id: String(s.id), label: s.label });
  }

  // 3) Inline `kind:uuid` markers in the raw speech.
  const inline = input.speech.matchAll(
    /\b(project|proje|personnel|personel|worker|supplier|taşeron|material|malzeme|task|görev|payment|ödeme|document|belge)\s*[:#]\s*([\w-]{6,})/gi,
  );
  for (const m of inline) {
    const kind = normKind(m[1]);
    if (kind) pushRef(out, { kind, id: m[2] });
  }

  return out.slice(0, 8);
};

/** Confidence heuristic for smart-navigation. */
export const inferNavConfidence = (
  refs: EntityRef[],
  speech: string,
): "high" | "medium" => {
  const strongVerb = /(açal[ıi]m|a[çc]t[ıi]m|göster|detay|geç|aç)/i.test(speech);
  return refs.length === 1 && strongVerb ? "high" : "medium";
};

export const hasEntityId = ID_RE;
