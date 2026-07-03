// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL = "google/gemini-3-flash-preview";

const SYSTEM_PROMPT = `Sen bir inşaat şirketi için çalışan kıdemli proje yöneticisisin.
Sana verilen toplantı transkriptini analiz et ve YALNIZCA aşağıdaki JSON formatında yanıt ver.
Türkçe yaz. Kesin bilgi olmayanı uydurma; bilinmiyorsa boş dizi/null bırak.

{
  "summary": "3-5 cümlelik yönetici özeti",
  "decisions": [{"title": "...", "detail": "..."}],
  "risks": [{"title": "...", "impact": "low|medium|high"}],
  "action_items": [{"title":"...","assignee":"kişi adı veya null","due_date":"YYYY-MM-DD veya null","priority":"low|medium|high|urgent"}],
  "questions": ["..."],
  "numbers": [{"label":"...","value":"..."}],
  "next_meeting": {"suggested_date":"YYYY-MM-DD veya null","topics":["..."]}
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "unauthorized" }, 401);

    const { meeting_id } = await req.json();
    if (!meeting_id) return json({ error: "missing_meeting_id" }, 400);

    const supaAnon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userRes } = await supaAnon.auth.getUser(jwt);
    const user = userRes?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: mt } = await admin
      .from("meeting_transcripts")
      .select("seq,speaker_label,text,started_at_ms")
      .eq("meeting_id", meeting_id)
      .order("seq");
    const { data: meeting } = await admin.from("meetings").select("*").eq("id", meeting_id).maybeSingle();
    if (!meeting) return json({ error: "meeting_not_found" }, 404);

    const transcript = (mt || [])
      .map((r) => `${r.speaker_label ? `[${r.speaker_label}] ` : ""}${r.text}`)
      .join("\n");

    if (!transcript.trim()) {
      await admin.from("meetings").update({ status: "completed" }).eq("id", meeting_id);
      return json({ ok: true, empty: true });
    }

    await admin.from("meetings").update({ status: "processing" }).eq("id", meeting_id);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Toplantı: ${meeting.title}\nTarih: ${meeting.started_at || ""}\n\nTranskript:\n${transcript.slice(0, 60000)}`,
          },
        ],
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text().catch(() => "");
      await admin.from("meetings").update({ status: "failed" }).eq("id", meeting_id);
      return json({ error: "ai_failed", detail: t, status: aiRes.status }, aiRes.status);
    }
    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { summary: raw }; }

    await admin.from("meeting_analyses").upsert(
      {
        meeting_id,
        user_id: user.id,
        summary: parsed.summary || null,
        decisions: parsed.decisions || [],
        risks: parsed.risks || [],
        action_items: parsed.action_items || [],
        questions: parsed.questions || [],
        numbers: parsed.numbers || [],
        next_meeting: parsed.next_meeting || null,
        model: MODEL,
        prompt_version: "v1",
      },
      { onConflict: "meeting_id" },
    );

    // Stage action items as pending
    const items = Array.isArray(parsed.action_items) ? parsed.action_items : [];
    if (items.length) {
      const rows = items.map((it: any) => ({
        meeting_id,
        user_id: user.id,
        title: String(it.title || "Aksiyon").slice(0, 300),
        description: it.detail || null,
        assignee_name: it.assignee || null,
        due_date: it.due_date && /^\d{4}-\d{2}-\d{2}$/.test(it.due_date) ? it.due_date : null,
        priority: ["low", "medium", "high", "urgent"].includes(it.priority) ? it.priority : "medium",
        status: "pending",
      }));
      await admin.from("meeting_action_items").insert(rows);
    }

    await admin.from("meetings").update({ status: "completed" }).eq("id", meeting_id);

    return json({ ok: true, analysis: parsed, action_item_count: items.length });
  } catch (e) {
    console.error("meeting-analyze error", e);
    return json({ error: "internal", detail: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
