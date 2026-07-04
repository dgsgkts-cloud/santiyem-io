// Extract candidate company memories from a chat turn.
// Uses Gemini flash to spot durable business facts, dedupes via semantic
// similarity, honors user-dismissed categories, and returns proposals only —
// nothing is inserted until the user confirms via /company-memory upsert.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { embedText } from "../_shared/embeddings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash-lite";

const CATEGORIES = [
  "company", "project", "supplier", "customer", "personnel",
  "decision", "preference", "workflow", "finance", "safety",
] as const;
type Category = typeof CATEGORIES[number];

// company_memories.type is a Postgres enum with a smaller set — map category → type
const CATEGORY_TO_TYPE: Record<Category, string> = {
  company: "company",
  project: "project",
  supplier: "supplier",
  customer: "supplier",       // no customer enum yet, closest bucket
  personnel: "personnel",
  decision: "decision",
  preference: "preference",
  workflow: "preference",
  finance: "decision",
  safety: "decision",
};

const MIN_CONFIDENCE = 0.7;
const DUPLICATE_SIMILARITY = 0.85;

interface Proposal {
  title: string;
  content: string;
  type: string;
  category: Category;
  confidence: number;
  duplicate_of?: { id: string; title: string | null; similarity: number };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    if (!lovableKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const anon = createClient(supabaseUrl, anonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await anon.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const userText = String(body.userText || "").slice(0, 4000);
    const assistantText = String(body.assistantText || "").slice(0, 6000);
    if (!userText || !assistantText) return json({ proposals: [] });

    const sb = createClient(supabaseUrl, serviceKey);

    // 1) Load dismissed categories → skip those upfront
    const { data: dismissed } = await sb
      .from("memory_dismissed_categories")
      .select("category")
      .eq("user_id", userId);
    const banned = new Set((dismissed ?? []).map((r: any) => r.category));

    // 2) Ask the LLM to spot durable facts
    const systemPrompt = `Sen bir şantiye yönetim asistanısın. Bir kullanıcı-asistan diyaloğunu okuyup, ŞİRKETİN uzun vadeli hafızasında saklanmaya değecek DURABLE bilgileri çıkarıyorsun.

Sadece şunlara benzer, tekrar kullanılacak GERÇEK bilgileri çıkar:
- Tercih edilen tedarikçi / usta / taşeron
- Proje kararları (onaylanmış tasarım, malzeme seçimi)
- Şirket kuralları (ödeme vadesi, iskonto politikası, güvenlik kuralı)
- İş akışı tercihleri (hangi rapor formatı, hangi onay akışı)
- Malzeme / personel / müşteri tercihleri

ÇIKARMA:
- Günlük soru-cevap
- Geçici bilgi ("bugün hava yağmurlu")
- Zaten tarihe bağlı olaylar
- Belirsiz varsayımlar

Yalnızca JSON döndür. Şema:
{"proposals":[{"title":"kısa başlık","content":"tek cümle özet","category":"company|project|supplier|customer|personnel|decision|preference|workflow|finance|safety","confidence":0.0-1.0}]}
En fazla 3 öneri. Emin değilsen boş liste döndür.`;

    const dialog = `KULLANICI:\n${userText}\n\nASİSTAN:\n${assistantText}`;

    const aiRes = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: dialog },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text().catch(() => "");
      console.error("[extract-memories] ai error", aiRes.status, t.slice(0, 200));
      return json({ proposals: [] });
    }

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { proposals?: any[] } = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    const rawProposals: any[] = Array.isArray(parsed.proposals) ? parsed.proposals : [];

    // 3) Filter by confidence + banned categories, then dedupe by similarity
    const proposals: Proposal[] = [];
    for (const p of rawProposals.slice(0, 5)) {
      const category = (CATEGORIES as readonly string[]).includes(p?.category)
        ? (p.category as Category)
        : null;
      if (!category) continue;
      if (banned.has(category)) continue;

      const confidence = Number(p?.confidence);
      if (!isFinite(confidence) || confidence < MIN_CONFIDENCE) continue;

      const title = String(p?.title || "").slice(0, 200).trim();
      const content = String(p?.content || "").slice(0, 800).trim();
      if (!content || content.length < 8) continue;

      // Duplicate check via existing RPC
      let duplicate: Proposal["duplicate_of"] | undefined;
      try {
        const emb = await embedText(`${title}\n${content}`);
        const { data: matches } = await sb.rpc("match_company_memories", {
          _user_id: userId,
          _query_embedding: emb,
          _match_count: 1,
          _min_similarity: DUPLICATE_SIMILARITY,
          _type: null,
        });
        const top = (matches ?? [])[0];
        if (top && top.similarity >= DUPLICATE_SIMILARITY) {
          duplicate = { id: top.id, title: top.title, similarity: top.similarity };
        }
      } catch (e) {
        console.error("[extract-memories] dedupe failed", e);
      }
      if (duplicate) continue; // silently skip near-duplicates

      proposals.push({
        title,
        content,
        type: CATEGORY_TO_TYPE[category],
        category,
        confidence,
      });
    }

    return json({ proposals });
  } catch (e) {
    console.error("[extract-memories] error:", e);
    return json({ proposals: [] }, 200);
  }
});
