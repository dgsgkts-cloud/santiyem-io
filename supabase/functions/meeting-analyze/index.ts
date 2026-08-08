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
const MODEL = "google/gemini-3.6-flash";
const PROMPT_VERSION = "v2-action-engine";

/**
 * Speaker separation (diarization) prompt.
 *
 * The Lovable AI Gateway does not expose a dedicated diarizing transcription
 * model (only `openai/gpt-4o-transcribe` / `-mini-transcribe`), so speakers are
 * inferred from the transcript text itself. That inference is explicitly
 * confidence-scored and may return `unknown` — we never invent a speaker.
 */
const DIARIZE_PROMPT = `Sen bir toplantı transkriptini konuşmacılara ayıran bir analiz motorusun.
Sana numaralı transkript satırları verilecek. Her satırın hangi konuşmacıya ait olduğunu tahmin et.

KURALLAR:
- Konuşmacıları "Konuşmacı A", "Konuşmacı B", "Konuşmacı C" ... şeklinde etiketle.
- Aynı kişiye ait satırlar aynı etiketi almalı.
- Emin değilsen etiketi "unknown" bırak ve confidence değerini düşük ver.
- Konuşmacı sayısını uydurma; metinden anlaşılan kadar konuşmacı üret.
- Metni DEĞİŞTİRME, sadece etiketle.

YALNIZCA şu JSON ile yanıt ver:
{"segments":[{"seq":0,"speaker":"Konuşmacı A","confidence":0.0}],"speaker_count":0}`;

const ANALYZE_PROMPT = `Sen bir inşaat şirketinin kıdemli proje yöneticisisin. Sana bir toplantı transkripti verilecek.
Amacın: yöneticinin transkripti okumasına gerek kalmadan kararları, sorumlulukları ve açık konuları görmesi.

KURALLAR:
- Türkçe yaz, kısa ve operasyonel cümleler kullan.
- Transkriptte OLMAYAN hiçbir şeyi uydurma. Bilinmiyorsa null veya boş dizi bırak.
- Her aksiyon maddesi için transkriptten alıntı (source_quote) ver; alıntı yoksa maddeyi üretme.
- Sorumlu (assignee) yalnızca transkriptte açıkça belirtilmişse yaz; yoksa null.
- Tarihler YYYY-MM-DD. Transkriptte "önümüzdeki hafta" gibi göreli ifade varsa toplantı tarihine göre hesapla; hesaplayamıyorsan null.
- confidence 0-1 arası; emin olmadığın maddelere 0.5 altı ver.

YALNIZCA şu JSON ile yanıt ver:
{
  "summary": "3-5 cümlelik yönetici özeti",
  "decisions": [{"title":"...","detail":"...","speaker":"Konuşmacı A veya null","source_quote":"...","confidence":0.0}],
  "action_items": [{"title":"...","description":"...","assignee":"kişi adı veya null","speaker":"Konuşmacı A veya null","due_date":"YYYY-MM-DD veya null","priority":"low|medium|high|urgent","source_quote":"...","confidence":0.0}],
  "open_questions": [{"question":"...","context":"neden açık kaldı","owner":"kişi adı veya null"}],
  "risks": [{"title":"...","impact":"low|medium|high"}],
  "numbers": [{"label":"...","value":"..."}],
  "next_meeting": {"suggested_date":"YYYY-MM-DD veya null","topics":["..."]}
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  let meetingId = "";

  try {
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    meetingId = String(body?.meeting_id || "");
    const skipDiarization = body?.skip_diarization === true;
    if (!meetingId) return json({ error: "missing_meeting_id" }, 400);

    const supaAnon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userRes } = await supaAnon.auth.getUser(jwt);
    const user = userRes?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const { data: meeting } = await admin.from("meetings").select("*").eq("id", meetingId).maybeSingle();
    if (!meeting) return json({ error: "meeting_not_found" }, 404);

    const { data: allowed } = await admin.rpc("can_access_team_resource", {
      _accessor_id: user.id,
      _owner_id: meeting.user_id,
    });
    if (!allowed) return json({ error: "forbidden" }, 403);

    // ── Stage 1: transcript availability ────────────────────────────────
    const { data: segments } = await admin
      .from("meeting_transcripts")
      .select("id,seq,speaker_label,text,started_at_ms")
      .eq("meeting_id", meetingId)
      .order("seq");

    const rows = (segments || []) as any[];
    const joined = rows.map((r) => r.text).join("\n").trim();

    if (!joined) {
      await admin
        .from("meetings")
        .update({
          status: "completed",
          pipeline_stage: "transcript_missing",
          pipeline_error: "Kayıttan konuşma metni çıkarılamadı.",
        })
        .eq("id", meetingId);
      return json({ ok: true, empty: true, pipeline_stage: "transcript_missing" });
    }

    const { data: participants } = await admin
      .from("meeting_participants")
      .select("display_name,role,company")
      .eq("meeting_id", meetingId);
    const participantList = (participants || []) as any[];

    // ── Stage 2: speaker separation ─────────────────────────────────────
    let speakerCount = 0;
    let speakerLabels: string[] = [];
    const existingLabels = rows.filter((r) => r.speaker_label).length;

    if (!skipDiarization && rows.length >= 2) {
      await setStage(admin, meetingId, "diarizing");
      const diar = await callModel(DIARIZE_PROMPT, [
        participantList.length
          ? `Bilinen katılımcılar: ${participantList.map((p) => p.display_name).join(", ")}`
          : "Katılımcı listesi verilmedi.",
        "Transkript satırları:",
        ...rows.map((r) => `${r.seq}: ${r.text}`),
      ].join("\n").slice(0, 60000));

      const diarSegments = Array.isArray(diar?.segments) ? diar.segments : [];
      if (diarSegments.length) {
        const bySeq = new Map<number, { speaker: string; confidence: number }>();
        for (const s of diarSegments) {
          const label = typeof s?.speaker === "string" && s.speaker.trim() && s.speaker !== "unknown"
            ? s.speaker.trim().slice(0, 40)
            : null;
          if (label == null) continue;
          const conf = typeof s?.confidence === "number" ? Math.max(0, Math.min(1, s.confidence)) : null;
          bySeq.set(Number(s.seq), { speaker: label, confidence: conf ?? 0.5 });
        }
        speakerLabels = [...new Set([...bySeq.values()].map((v) => v.speaker))].sort();
        speakerCount = speakerLabels.length;

        // Persist labels in small batches so a long meeting does not stall.
        const updates = rows
          .filter((r) => bySeq.has(r.seq))
          .map((r) => ({ id: r.id, ...bySeq.get(r.seq)! }));
        for (let i = 0; i < updates.length; i += 20) {
          await Promise.all(
            updates.slice(i, i + 20).map((u) =>
              admin
                .from("meeting_transcripts")
                .update({ speaker_label: u.speaker, speaker_confidence: u.confidence })
                .eq("id", u.id),
            ),
          );
        }
      }
    } else if (existingLabels) {
      speakerLabels = [...new Set(rows.map((r) => r.speaker_label).filter(Boolean))].sort();
      speakerCount = speakerLabels.length;
    }

    // Re-read labelled transcript so the analysis pass sees speakers.
    const { data: labelled } = await admin
      .from("meeting_transcripts")
      .select("seq,speaker_label,text")
      .eq("meeting_id", meetingId)
      .order("seq");
    const transcriptText = ((labelled || []) as any[])
      .map((r) => `${r.speaker_label ? `[${r.speaker_label}] ` : ""}${r.text}`)
      .join("\n");

    // ── Stage 3: AI analysis ────────────────────────────────────────────
    await setStage(admin, meetingId, "analyzing", { status: "processing" });

    const speakerMap = (meeting.speaker_map || {}) as Record<string, string>;
    const parsed = await callModel(ANALYZE_PROMPT, [
      `Toplantı: ${meeting.title}`,
      `Tarih: ${(meeting.started_at || "").slice(0, 10) || "bilinmiyor"}`,
      participantList.length
        ? `Katılımcılar: ${participantList.map((p) => `${p.display_name}${p.role ? ` (${p.role})` : ""}`).join(", ")}`
        : "Katılımcı listesi verilmedi.",
      Object.keys(speakerMap).length
        ? `Konuşmacı eşleştirmesi: ${Object.entries(speakerMap).map(([k, v]) => `${k} = ${v}`).join(", ")}`
        : "",
      "",
      "Transkript:",
      transcriptText.slice(0, 60000),
    ].filter(Boolean).join("\n"));

    const decisions = normalizeList(parsed?.decisions);
    const actionItems = normalizeList(parsed?.action_items);
    const openQuestions = normalizeList(parsed?.open_questions);
    const risks = normalizeList(parsed?.risks);

    await admin.from("meeting_analyses").upsert(
      {
        meeting_id: meetingId,
        user_id: meeting.user_id,
        summary: parsed?.summary || null,
        decisions,
        risks,
        // `action_items` + `questions` stay in the legacy shape the PDF export reads.
        action_items: actionItems,
        questions: openQuestions.map((q: any) => (typeof q === "string" ? q : q?.question)).filter(Boolean),
        open_questions: openQuestions,
        speakers: speakerLabels,
        numbers: normalizeList(parsed?.numbers),
        next_meeting: parsed?.next_meeting || null,
        model: MODEL,
        prompt_version: PROMPT_VERSION,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "meeting_id" },
    );

    // ── Stage 4: stage action items for confirmation ─────────────────────
    // Only untouched suggestions are replaced — approved/converted/rejected
    // decisions the user already made are preserved.
    await admin.from("meeting_action_items").delete().eq("meeting_id", meetingId).eq("status", "pending");

    const resolvedName = (raw: any, speaker: any) => {
      const direct = typeof raw === "string" && raw.trim() ? raw.trim() : null;
      if (direct) {
        const match = participantList.find(
          (p) => p.display_name.toLowerCase().includes(direct.toLowerCase()) ||
            direct.toLowerCase().includes(p.display_name.toLowerCase()),
        );
        return match?.display_name || direct;
      }
      const mapped = speaker && speakerMap[String(speaker)];
      return mapped || null;
    };

    const insertRows = actionItems
      .filter((it: any) => String(it?.title || "").trim())
      .map((it: any) => ({
        meeting_id: meetingId,
        user_id: meeting.user_id,
        title: String(it.title).slice(0, 300),
        description: it.description || it.detail || null,
        assignee_name: resolvedName(it.assignee, it.speaker),
        speaker_label: typeof it.speaker === "string" ? it.speaker.slice(0, 40) : null,
        source_quote: typeof it.source_quote === "string" ? it.source_quote.slice(0, 1000) : null,
        confidence: typeof it.confidence === "number" ? Math.max(0, Math.min(1, it.confidence)) : null,
        due_date: /^\d{4}-\d{2}-\d{2}$/.test(String(it.due_date || "")) ? it.due_date : null,
        priority: ["low", "medium", "high", "urgent"].includes(it.priority) ? it.priority : "medium",
        status: "pending",
      }));

    if (insertRows.length) await admin.from("meeting_action_items").insert(insertRows);

    await admin
      .from("meetings")
      .update({ status: "completed", pipeline_stage: "ready", pipeline_error: null })
      .eq("id", meetingId);

    return json({
      ok: true,
      pipeline_stage: "ready",
      speaker_count: speakerCount,
      speakers: speakerLabels,
      action_item_count: insertRows.length,
      decision_count: decisions.length,
      open_question_count: openQuestions.length,
    });
  } catch (e) {
    console.error("meeting-analyze error", e);
    if (meetingId) {
      await admin
        .from("meetings")
        .update({ status: "failed", pipeline_stage: "failed", pipeline_error: String(e).slice(0, 500) })
        .eq("id", meetingId)
        .then(() => {}, () => {});
    }
    return json({ error: "internal", detail: String(e) }, 500);
  }
});

async function setStage(admin: any, meetingId: string, stage: string, extra: Record<string, unknown> = {}) {
  await admin.from("meetings").update({ pipeline_stage: stage, pipeline_error: null, ...extra }).eq("id", meetingId);
}

function normalizeList(v: any): any[] {
  return Array.isArray(v) ? v : [];
}

async function callModel(system: string, userContent: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI kullanım limiti aşıldı, lütfen kısa süre sonra tekrar deneyin.");
    if (res.status === 402) throw new Error("AI kredisi tükendi. Lütfen kredi ekleyin.");
    throw new Error(`AI hatası (${res.status}): ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    return { summary: String(raw).slice(0, 4000) };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
