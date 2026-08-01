// ============================================================
// supabase/functions/_shared/realtimeModel.ts
// Single source of truth for the OpenAI Realtime model.
//
// The model is resolved SERVER-SIDE ONLY, from the environment
// variable OPENAI_REALTIME_MODEL. The browser can never influence
// it (no body field, no query param, no localStorage).
// ============================================================

/** Non-authoritative safety net when the environment is not configured. */
export const DEFAULT_REALTIME_MODEL = "gpt-realtime";

export type RealtimeModelSource = "env" | "default";

export interface ResolvedRealtimeModel {
  model: string;
  source: RealtimeModelSource;
}

/**
 * Resolves the Realtime model from an environment map.
 * Whitespace is trimmed; empty / whitespace-only values fall back to the default.
 */
export function resolveRealtimeModel(
  read: (key: string) => string | undefined,
): ResolvedRealtimeModel {
  const raw = read("OPENAI_REALTIME_MODEL");
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (trimmed.length > 0) return { model: trimmed, source: "env" };
  return { model: DEFAULT_REALTIME_MODEL, source: "default" };
}
