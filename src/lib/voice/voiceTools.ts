// ============================================================
// src/lib/voice/voiceTools.ts
// ONE tool system shared by text chat and every voice provider.
// Tool *schemas* live here; execution is delegated to the app so
// the engine layer stays UI-agnostic.
// ============================================================

import type { VoiceToolCall, VoiceToolDefinition, VoiceToolResult } from "./voiceTypes";
import { SUPABASE_URL } from "./voiceConfig";
import { supabase } from "@/integrations/supabase/client";

export const VOICE_TOOLS: VoiceToolDefinition[] = [
  {
    name: "query_project_data",
    description:
      "Şirketin canlı verisinden (projeler, hakediş, nakit, personel, depo, filo) bilgi sorgular. " +
      "Kullanıcı somut bir rakam, durum veya liste istediğinde çağır.",
    parameters: {
      type: "object",
      properties: {
        question: { type: "string", description: "Doğal dilde tam soru (Türkçe)." },
        scope: {
          type: "string",
          enum: ["finance", "projects", "personnel", "inventory", "fleet", "general"],
          description: "Sorunun ilgili olduğu operasyon alanı.",
        },
      },
      required: ["question"],
      additionalProperties: false,
    },
  },
  {
    name: "navigate_to",
    description: "Uygulamada bir modülü veya proje detayını açar.",
    parameters: {
      type: "object",
      properties: {
        tab: { type: "string", description: "Hedef modül anahtarı, örn. 'projeler', 'odemeler-kasa', 'hakedis'." },
        projectId: { type: "string", description: "Varsa açılacak projenin ID'si." },
      },
      required: ["tab"],
      additionalProperties: false,
    },
  },
  {
    name: "render_dashboard_card",
    description: "Sesli yanıtla birlikte ekranda görsel bir kart/KPI gösterir.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        value: { type: "string" },
        detail: { type: "string" },
        tone: { type: "string", enum: ["positive", "warning", "danger", "neutral"] },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
];

/** UI hooks listen for these to render cards / navigate. */
export const VOICE_UI_EVENT = "voice-ui-event";

function dispatchUi(kind: string, payload: unknown) {
  try {
    window.dispatchEvent(new CustomEvent(VOICE_UI_EVENT, { detail: { kind, payload } }));
  } catch { /* noop */ }
}

/** Default executor: reuses the Construction Brain (`chat`) for data queries. */
export async function executeVoiceTool(call: VoiceToolCall): Promise<VoiceToolResult> {
  try {
    switch (call.name) {
      case "navigate_to": {
        const tab = String(call.args.tab ?? "");
        if (!tab) return { ok: false, error: "missing_tab" };
        window.dispatchEvent(new CustomEvent("navigate-tab", { detail: { tab, projectId: call.args.projectId } }));
        dispatchUi("navigate", call.args);
        return { ok: true, data: { navigated: tab } };
      }
      case "render_dashboard_card": {
        dispatchUi("card", call.args);
        return { ok: true, data: { rendered: true } };
      }
      case "query_project_data": {
        const question = String(call.args.question ?? "").trim();
        if (!question) return { ok: false, error: "missing_question" };
        const { data: sess } = await supabase.auth.getSession();
        const jwt = sess?.session?.access_token ?? "";
        const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
          body: JSON.stringify({
            messages: [{ role: "user", content: question }],
            voice_mode: true,
            stream: false,
          }),
        });
        const text = await res.text();
        if (!res.ok) return { ok: false, error: `chat_${res.status}: ${text.slice(0, 300)}` };
        // The brain may answer as SSE or JSON; normalise to plain text.
        let answer = text;
        try {
          const j = JSON.parse(text);
          answer = j?.speech ?? j?.text ?? j?.choices?.[0]?.message?.content ?? text;
        } catch {
          answer = text
            .split("\n")
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).trim())
            .filter((l) => l && l !== "[DONE]")
            .map((l) => { try { return JSON.parse(l)?.choices?.[0]?.delta?.content ?? ""; } catch { return ""; } })
            .join("");
        }
        return { ok: true, data: { answer: String(answer).slice(0, 4000) } };
      }
      default:
        return { ok: false, error: `unknown_tool:${call.name}` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
