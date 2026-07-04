// Shared licensing helpers for Sprint 11.1 — Subscription & Licensing.
// Read plan/features/limits/usage; enforce quotas; increment counters.
// All checks respect organization overrides via RPCs seeded in the migration.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

export type Metric =
  | "users"
  | "projects"
  | "storage_mb"
  | "kb_storage_mb"
  | "company_memory_writes_month"
  | "voice_minutes_month"
  | "ai_requests_month"
  | "comm_messages_month";

export type FeatureKey =
  | "voice_copilot" | "executive_brief" | "company_memory" | "knowledge_base"
  | "communication_hub" | "email_accounts" | "whatsapp" | "meetings"
  | "hakedis_ai" | "contracts_ai" | "gayrimenkul360" | "demo_seed"
  | "advanced_reports" | "api_access" | "sso";

export interface QuotaResult {
  limit: number | null;
  used: number;
  remaining: number | null;
  enforcement: "hard" | "soft";
  grace_pct: number;
  over: boolean;
}

export interface LicensingError extends Error {
  code: "quota_exceeded" | "feature_disabled";
  status: number;
  metric?: string;
  feature?: string;
}

function makeError(
  code: LicensingError["code"],
  message: string,
  extra: Partial<LicensingError> = {},
): LicensingError {
  const e = new Error(message) as LicensingError;
  e.code = code;
  e.status = 402;
  Object.assign(e, extra);
  return e;
}

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** User-scoped client (uses caller JWT so RLS + RPC auth.uid() are correct). */
export function userClient(authHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
}

/** Reads plan feature (with org overrides). Returns false on any error/unauth. */
export async function checkFeature(
  client: SupabaseClient,
  key: FeatureKey,
): Promise<boolean> {
  const { data, error } = await client.rpc("check_feature", { _key: key });
  if (error) return false;
  return !!data;
}

export async function assertFeature(
  client: SupabaseClient,
  key: FeatureKey,
): Promise<void> {
  const ok = await checkFeature(client, key);
  if (!ok) {
    throw makeError("feature_disabled", `Feature ${key} not enabled on this plan`, {
      feature: key,
    });
  }
}

export async function checkQuota(
  client: SupabaseClient,
  metric: Metric,
): Promise<QuotaResult | null> {
  const { data, error } = await client.rpc("check_quota", { _key: metric });
  if (error || !data) return null;
  return data as QuotaResult;
}

/**
 * Enforce a quota. `delta` defaults to 1 (about to add one unit).
 * - hard: throws when used + delta > limit.
 * - soft: throws only when used + delta > limit * (1 + grace_pct/100).
 * Unlimited (limit < 0) always passes.
 */
export async function assertQuota(
  client: SupabaseClient,
  metric: Metric,
  delta = 1,
): Promise<QuotaResult | null> {
  const q = await checkQuota(client, metric);
  if (!q) return null;
  if (q.limit === null || q.limit < 0) return q;
  const projected = q.used + delta;
  const cap = q.enforcement === "soft"
    ? Math.floor(q.limit * (1 + (q.grace_pct || 0) / 100))
    : q.limit;
  if (projected > cap) {
    throw makeError("quota_exceeded", `Quota exceeded for ${metric}`, {
      metric,
    });
  }
  return q;
}

/** Fire-and-forget usage increment. Uses the user's JWT so team_id is derived from auth.uid(). */
export async function incrementUsage(
  client: SupabaseClient,
  metric: Metric,
  delta = 1,
  reason?: string,
): Promise<void> {
  try {
    await client.rpc("increment_usage", {
      _metric: metric,
      _delta: delta,
      _reason: reason ?? null,
    });
  } catch (_) {
    /* usage tracking must never break request flow */
  }
}

export function licensingErrorResponse(
  err: unknown,
  corsHeaders: Record<string, string>,
): Response | null {
  const e = err as LicensingError | undefined;
  if (!e || (e.code !== "quota_exceeded" && e.code !== "feature_disabled")) return null;
  return new Response(
    JSON.stringify({
      error: e.message,
      code: e.code,
      metric: e.metric,
      feature: e.feature,
    }),
    {
      status: e.status || 402,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
