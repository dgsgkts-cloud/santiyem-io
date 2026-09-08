// Profit / Risk Agent — proactive analysis layer.
//
// HARD RULE: the LLM never computes or invents a financial number.
// This function builds deterministic "signals" from the existing database
// financial engine (project_financials / cost_code_financials / project_risks /
// project_forecast_snapshots / portfolio_financials). The model may only pick,
// rank and explain those signals. Every amount written to the database is copied
// back from the signal, never from the model output.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-2.5-flash";
const PROMPT_VERSION = "profit-agent/1";
const MODEL_VERSION = `${MODEL}@${PROMPT_VERSION}`;
const FRESH_MINUTES = 20;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v) || 0);
const clamp = (s: unknown, max: number) =>
  typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "";

type Signal = {
  id: string;
  type: string;
  project_id: string;
  project_name?: string | null;
  cost_code_id: string | null;
  label: string;
  amount: number | null;
  severity: string | null;
  related_risk_ids: string[];
  fingerprint: string;
  facts: string;
};

const SEV_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

/* ---------------------------------------------------------------- signals */

async function projectSignals(sb: any, projectId: string) {
  const [finRes, ccRes, riskRes, snapRes, projRes] = await Promise.all([
    sb.rpc("project_financials", { _project_id: projectId }),
    sb.rpc("cost_code_financials", { _project_id: projectId }),
    sb.from("project_risks").select("*").eq("project_id", projectId)
      .in("status", ["open", "acknowledged"]).order("detected_at", { ascending: false }).limit(40),
    sb.from("project_forecast_snapshots").select("*").eq("project_id", projectId)
      .order("snapshot_date", { ascending: true }).limit(60),
    sb.from("projects").select("id,name").eq("id", projectId).maybeSingle(),
  ]);

  const finRow = Array.isArray(finRes.data) ? finRes.data[0] : finRes.data;
  if (!finRow) return null;

  const projectName = projRes.data?.name ?? null;
  const items = (ccRes.data ?? []) as any[];
  const risks = (riskRes.data ?? []) as any[];
  const snaps = (snapRes.data ?? []) as any[];

  const fin = {
    forecast_revenue: num(finRow.forecast_revenue),
    original_budget: num(finRow.original_budget),
    actual_cost: num(finRow.actual_cost),
    remaining_committed: num(finRow.remaining_committed_cost),
    forecast_final_cost: num(finRow.eac),
    original_expected_profit: num(finRow.original_expected_profit),
    forecast_final_profit: num(finRow.forecast_final_profit),
    profit_erosion: num(finRow.profit_erosion),
    forecast_margin: num(finRow.forecast_margin_percent),
  };

  const uncoded = items.find((i) => i.is_uncoded);
  const coded = items.filter((i) => !i.is_uncoded);

  const quality = {
    budget_ready: fin.original_budget > 0,
    progress_available: coded.some((i) => i.has_progress),
    forecast_history_available: snaps.length >= 2,
    unallocated_cost_amount: num(uncoded?.actual_cost),
  };

  const signals: Signal[] = [];
  const push = (s: Omit<Signal, "id" | "project_id" | "project_name">) =>
    signals.push({ ...s, id: `s${signals.length + 1}`, project_id: projectId, project_name: projectName });

  // A) cost code overruns — budget_variance > 0 means EAC above budget
  if (quality.budget_ready) {
    coded
      .filter((i) => num(i.budget_variance) > 0)
      .sort((a, b) => num(b.budget_variance) - num(a.budget_variance))
      .slice(0, 6)
      .forEach((i) => {
        const name = i.name || i.code;
        push({
          type: "cost_overrun",
          cost_code_id: i.cost_code_id,
          label: `${name} kalemi bütçe aşımı`,
          amount: num(i.budget_variance),
          severity: null,
          related_risk_ids: risks.filter((r) => r.cost_code_id === i.cost_code_id).map((r) => r.id),
          fingerprint: `cost_overrun:${i.cost_code_id}`,
          facts:
            `İş kalemi "${name}". Başlangıç bütçesi ${num(i.original_budget)}. ` +
            `Tahmini final maliyet ${num(i.eac)}. Bütçe aşımı ${num(i.budget_variance)}. ` +
            `Bugüne kadar harcanan ${num(i.actual_cost)}. Bağlanmış kalan ${num(i.remaining_committed)}. ` +
            (i.has_progress ? `Fiziksel ilerleme %${num(i.progress_percent)}.` : `Bu kalem için ilerleme kaydı yok.`),
        });
      });
  }

  // B) forecast profit trend from snapshots
  if (quality.forecast_history_available) {
    const last = snaps[snaps.length - 1];
    const cutoff = Date.now() - 30 * 86400000;
    const older =
      [...snaps].reverse().find((s) => new Date(s.snapshot_date).getTime() <= cutoff) ?? snaps[0];
    const delta = num(last.forecast_profit) - num(older.forecast_profit);
    if (older !== last && delta < 0) {
      push({
        type: "profit_trend_down",
        cost_code_id: null,
        label: "Tahmini final kâr son kayıtlarda geriledi",
        amount: Math.abs(delta),
        severity: null,
        related_risk_ids: [],
        fingerprint: "profit_trend_down",
        facts:
          `${older.snapshot_date} tarihli kayıtta tahmini final kâr ${num(older.forecast_profit)}, ` +
          `${last.snapshot_date} tarihli kayıtta ${num(last.forecast_profit)}. Değişim ${delta}.`,
      });
    }
  }

  // C) unallocated (uncoded) cost
  if (quality.unallocated_cost_amount > 0) {
    push({
      type: "unallocated_cost",
      cost_code_id: null,
      label: "Kategorize edilmemiş maliyet",
      amount: quality.unallocated_cost_amount,
      severity: null,
      related_risk_ids: [],
      fingerprint: "unallocated_cost",
      facts:
        `${quality.unallocated_cost_amount} tutarındaki gider proje toplamına dahil ancak hiçbir iş kalemine bağlı değil.`,
    });
  }

  // D) deterministic risks (severity comes from the risk engine, never from the model)
  risks
    .sort(
      (a, b) =>
        (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0) ||
        num(b.financial_impact) - num(a.financial_impact),
    )
    .slice(0, 10)
    .forEach((r) => {
      push({
        type: `risk_${r.risk_type}`,
        cost_code_id: r.cost_code_id ?? null,
        label: r.title,
        amount: r.financial_impact === null ? null : num(r.financial_impact),
        severity: r.severity,
        related_risk_ids: [r.id],
        fingerprint: `risk:${r.risk_type}:${r.cost_code_id ?? "-"}`,
        facts:
          `Risk motoru kaydı. Önem: ${r.severity}. ${clamp(r.title, 160)}. ${clamp(r.description, 300)} ` +
          (r.financial_impact !== null ? `Finansal etki ${num(r.financial_impact)}.` : "Finansal etki hesaplanmadı.") +
          (r.recommended_action ? ` Sistem önerisi: ${clamp(r.recommended_action, 160)}` : ""),
      });
    });

  // E) data quality
  if (!quality.budget_ready) {
    push({
      type: "missing_budget",
      cost_code_id: null,
      label: "Kârlılık analizi için başlangıç bütçesi gerekli",
      amount: null,
      severity: null,
      related_risk_ids: [],
      fingerprint: "missing_budget",
      facts: `Bu projede başlangıç bütçesi girilmemiş. Bugüne kadar harcanan ${fin.actual_cost}.`,
    });
  }

  return { fin, quality, signals, projectName, snapshotCount: snaps.length };
}

async function portfolioSignals(sb: any) {
  const { data } = await sb.rpc("portfolio_financials");
  const raw = (data ?? {}) as any;
  const projects = (raw.projects ?? []) as any[];
  const risks = (raw.risks ?? []) as any[];
  const totals = (raw.totals ?? {}) as any;

  const signals: Signal[] = [];
  const push = (s: Omit<Signal, "id">) => signals.push({ ...s, id: `s${signals.length + 1}` });

  projects
    .filter((p) => p.is_ready && num(p.profit_erosion) > 0)
    .sort((a, b) => num(b.profit_erosion) - num(a.profit_erosion))
    .slice(0, 6)
    .forEach((p) => {
      push({
        type: "project_profit_erosion",
        project_id: String(p.id),
        project_name: p.name,
        cost_code_id: null,
        label: `${p.name} projesinde kâr kaybı`,
        amount: num(p.profit_erosion),
        severity: null,
        related_risk_ids: [],
        fingerprint: `pf:erosion:${p.id}`,
        facts:
          `Proje "${p.name}". Başlangıçta beklenen kâr ${num(p.original_expected_profit)}, ` +
          `tahmini final kâr ${num(p.forecast_final_profit)}, kâr kaybı ${num(p.profit_erosion)}. ` +
          `Açık risk sayısı ${num(p.open_risks)}, kritik ${num(p.critical_risks)}.`,
      });
    });

  risks
    .sort(
      (a, b) =>
        (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0) ||
        num(b.financial_impact) - num(a.financial_impact),
    )
    .slice(0, 8)
    .forEach((r) => {
      push({
        type: `pf_risk_${r.risk_type}`,
        project_id: String(r.project_id),
        project_name: r.project_name,
        cost_code_id: r.cost_code_id ?? null,
        label: `${r.project_name ?? "Proje"} — ${r.title}`,
        amount: r.financial_impact === null ? null : num(r.financial_impact),
        severity: r.severity,
        related_risk_ids: [r.id],
        fingerprint: `pf:risk:${r.project_id}:${r.risk_type}:${r.cost_code_id ?? "-"}`,
        facts:
          `Proje "${r.project_name}". Risk motoru kaydı, önem ${r.severity}. ${clamp(r.title, 160)}. ` +
          `${clamp(r.description, 240)} ` +
          (r.financial_impact !== null ? `Finansal etki ${num(r.financial_impact)}.` : ""),
      });
    });

  return {
    totals: {
      project_count: num(totals.project_count),
      ready_count: num(totals.ready_count),
      forecast_final_profit: num(totals.forecast_final_profit),
      original_expected_profit: num(totals.original_expected_profit),
      profit_erosion: num(totals.profit_erosion),
      open_risks: num(totals.open_risks),
    },
    signals,
  };
}

/* -------------------------------------------------------------------- LLM */

const SYSTEM = `Sen Şantiyem AI'ın kâr ve risk analistisin. Küçük/orta ölçekli bir inşaat firmasının sahibine sade Türkçe ile "bugün neye bakması gerektiğini" anlatıyorsun.

KESİN KURALLAR:
- Hiçbir finansal hesap yapma. Sana verilen sinyallerdeki rakamların dışına çıkma, yeni rakam üretme, toplama/çıkarma yapma.
- Sinyal listesinde olmayan bir maliyet kalemi, risk veya olay uydurma.
- Risklerin önem derecesini değiştirme. Sadece yöneticinin önce hangi konuyu okuması gerektiğini sırala.
- "Kesin zarar edeceksiniz" gibi kesin hüküm ve hukuki yorum kullanma. "Mevcut kayıtlara göre ... görünüyor" dilini kullan.
- İlerleme verisi olmayan kalemler için ilerlemeye dayalı yorum yapma. Tahmin geçmişi yoksa trend iddiası kurma.
- EAC, ETC, committed cost gibi teknik terim kullanma. Sade karşılıklarını kullan (tahmini final maliyet, bağlanmış maliyet, kâr kaybı).
- Gerçekten önemli bir gelişme yoksa zorla içgörü üretme, boş liste döndür ve özet olarak bunu söyle.
- Her içgörü tek ve somut bir aksiyon önersin. Uzun danışmanlık metni yazma (açıklama en fazla 2 kısa cümle).
- Seçtiğin her içgörü mutlaka bir signal_id'ye dayanmalı.`;

async function callModel(payload: unknown, maxInsights: number) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("missing_ai_key");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content:
            `En fazla ${maxInsights} içgörü seç ve önem sırasına diz.\n\nVERİ PAKETİ (tüm rakamlar deterministik finans motorundan gelir):\n` +
            JSON.stringify(payload),
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "rapor_ver",
            description: "Yöneticiye gösterilecek öncelikli içgörüleri döndür",
            parameters: {
              type: "object",
              properties: {
                overall_status: { type: "string", enum: ["critical", "attention", "normal", "positive"] },
                summary: { type: "string", description: "Tek cümlelik yönetici özeti" },
                insights: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      signal_id: { type: "string" },
                      priority: { type: "number" },
                      title: { type: "string", description: "Kısa başlık, en fazla 60 karakter" },
                      explanation: { type: "string", description: "En fazla 2 kısa cümle" },
                      recommended_action: { type: "string", description: "Tek somut aksiyon" },
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                    },
                    required: ["signal_id", "priority", "title", "explanation", "recommended_action", "confidence"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["overall_status", "summary", "insights"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "rapor_ver" } },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("ai gateway error", res.status, text);
    throw new Error(res.status === 429 ? "rate_limited" : res.status === 402 ? "payment_required" : "ai_failed");
  }
  const body = await res.json();
  const args = body?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("ai_invalid");
  return JSON.parse(args) as {
    overall_status: string;
    summary: string;
    insights: any[];
  };
}

/* ------------------------------------------------------------- persistence */

const STATUSES = ["critical", "attention", "normal", "positive"];

async function persist(
  sb: any,
  userId: string,
  scope: "project" | "portfolio",
  projectId: string | null,
  signals: Signal[],
  model: { overall_status: string; summary: string; insights: any[] },
  maxInsights: number,
) {
  const byId = new Map(signals.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const rows: any[] = [];

  for (const raw of Array.isArray(model.insights) ? model.insights : []) {
    const sig = byId.get(String(raw?.signal_id));
    if (!sig || seen.has(sig.fingerprint)) continue;
    const title = clamp(raw.title, 90) || clamp(sig.label, 90);
    const summary = clamp(raw.explanation, 400);
    if (!title || !summary) continue;
    seen.add(sig.fingerprint);
    rows.push({
      user_id: userId,
      project_id: sig.project_id,
      scope,
      insight_type: sig.type,
      priority: rows.length + 1,
      title,
      summary,
      recommended_action: clamp(raw.recommended_action, 160) || null,
      // amount ALWAYS from the deterministic signal, never from the model
      financial_impact: sig.amount,
      cost_code_id: sig.cost_code_id,
      related_risk_ids: sig.related_risk_ids,
      confidence: ["high", "medium", "low"].includes(raw.confidence) ? raw.confidence : "medium",
      status: "active",
      fingerprint: (scope === "portfolio" ? "" : "") + sig.fingerprint,
      data_as_of: new Date().toISOString(),
      generated_at: new Date().toISOString(),
      model_version: MODEL_VERSION,
      metadata: { severity: sig.severity, signal_label: sig.label, scope_summary: clamp(model.summary, 300) },
    });
    if (rows.length >= maxInsights) break;
  }

  // fetch existing insights of this scope to update-in-place (duplicate protection)
  let q = sb.from("ai_project_insights").select("id,fingerprint,project_id").eq("user_id", userId).eq("scope", scope);
  if (scope === "project" && projectId) q = q.eq("project_id", projectId);
  const { data: existing } = await q;
  const existingMap = new Map<string, string>();
  (existing ?? []).forEach((e: any) => existingMap.set(`${e.project_id ?? "-"}|${e.fingerprint}`, e.id));

  const keptIds: string[] = [];
  for (const row of rows) {
    const key = `${row.project_id ?? "-"}|${row.fingerprint}`;
    const id = existingMap.get(key);
    if (id) {
      await sb.from("ai_project_insights").update({ ...row, status: "active" }).eq("id", id);
      keptIds.push(id);
    } else {
      const { data: ins } = await sb.from("ai_project_insights").insert(row).select("id").maybeSingle();
      if (ins?.id) keptIds.push(ins.id);
    }
  }

  // problems that no longer appear are resolved, not deleted
  const stale = (existing ?? []).filter((e: any) => !keptIds.includes(e.id)).map((e: any) => e.id);
  if (stale.length) {
    await sb.from("ai_project_insights").update({ status: "resolved" }).in("id", stale);
  }

  return {
    overall_status: STATUSES.includes(model.overall_status) ? model.overall_status : "normal",
    summary: clamp(model.summary, 300),
    count: rows.length,
  };
}

/* -------------------------------------------------------------------- main */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: auth } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
  const user = auth?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  let payload: any = {};
  try { payload = await req.json(); } catch { /* empty body allowed */ }
  const scope: "project" | "portfolio" = payload?.scope === "portfolio" ? "portfolio" : "project";
  const projectId = payload?.project_id ? String(payload.project_id) : null;
  const force = payload?.force === true;
  if (scope === "project" && !projectId) return json({ error: "project_id gerekli" }, 400);

  try {
    // freshness / debounce: skip the model when a recent analysis exists
    let fq = sb.from("ai_project_insights").select("generated_at")
      .eq("user_id", user.id).eq("scope", scope)
      .order("generated_at", { ascending: false }).limit(1);
    if (scope === "project" && projectId) fq = fq.eq("project_id", projectId);
    const { data: fresh } = await fq;
    const last = fresh?.[0]?.generated_at ? new Date(fresh[0].generated_at).getTime() : 0;
    if (!force && last && Date.now() - last < FRESH_MINUTES * 60_000) {
      return json({ ok: true, skipped: "fresh", generated_at: fresh![0].generated_at });
    }

    const maxInsights = scope === "portfolio" ? 5 : 3;
    let modelPayload: any;
    let signals: Signal[];

    if (scope === "project") {
      const ctx = await projectSignals(sb, projectId!);
      if (!ctx) return json({ error: "Proje bulunamadı" }, 404);
      signals = ctx.signals;
      modelPayload = {
        scope: "project",
        project: { project_id: projectId, project_name: ctx.projectName, ...ctx.fin },
        data_quality: ctx.quality,
        signals: signals.map((s) => ({
          signal_id: s.id, type: s.type, severity: s.severity, amount: s.amount, facts: s.facts,
        })),
      };
    } else {
      const ctx = await portfolioSignals(sb);
      signals = ctx.signals;
      modelPayload = {
        scope: "portfolio",
        portfolio: ctx.totals,
        signals: signals.map((s) => ({
          signal_id: s.id, type: s.type, project_name: s.project_name,
          severity: s.severity, amount: s.amount, facts: s.facts,
        })),
      };
    }

    if (!signals.length) {
      // nothing worth reporting — resolve old insights, no LLM cost
      let q = sb.from("ai_project_insights").update({ status: "resolved" })
        .eq("user_id", user.id).eq("scope", scope).eq("status", "active");
      if (scope === "project" && projectId) q = q.eq("project_id", projectId);
      await q;
      return json({ ok: true, overall_status: "normal", summary: "Bugün kritik yeni bir değişiklik görünmüyor.", count: 0 });
    }

    const model = await callModel(modelPayload, maxInsights);
    const result = await persist(sb, user.id, scope, projectId, signals, model, maxInsights);
    return json({ ok: true, ...result });
  } catch (e) {
    const reason = e instanceof Error ? e.message : "ai_failed";
    console.error("profit-agent failed", reason);
    // The finance dashboard must keep working; old valid insights stay visible.
    return json({ ok: false, reason }, reason === "rate_limited" ? 429 : reason === "payment_required" ? 402 : 200);
  }
});
