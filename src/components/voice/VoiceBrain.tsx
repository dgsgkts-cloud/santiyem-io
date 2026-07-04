// VoiceBrain — Unified voice pipeline (Sprint 5).
//
//   Microphone → voice-stt (Lovable AI) → chat (Construction Brain)
//              → parseAIResponse { speech, ui } → voice-tts (ElevenLabs)
//              → Frontend Renderer (AIResponseRenderer) + audio playback.
//
// ElevenLabs is speech transport only. All reasoning, business logic and UI
// payload generation stays in `supabase/functions/chat/index.ts` (Construction
// Brain), so chat, voice, mobile and future API share the same brain.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Mic, MicOff, Square, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import type { VoiceAccess } from "@/hooks/useVoiceAccess";
import { parseAIResponse } from "@/hooks/useAIResponse";
import { AIResponseRenderer, type AIUiPayload } from "@/components/ai/AIResponseRenderer";
import "@/styles/voice.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

type PipelineState = "idle" | "recording" | "transcribing" | "thinking" | "speaking" | "error";

interface Turn {
  id: string;
  userText: string;
  speech: string;
  ui: AIUiPayload[];
  ts: number;
}

interface Props {
  onClose: () => void;
  access: VoiceAccess;
  initialContext?: string;
}

// ---------- Web Audio → WAV (self-contained, decodable in all browsers) -----

function encodeWav(chunks: Float32Array[], sampleRate: number, targetRate = 16000): Blob {
  // Concatenate
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const flat = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) { flat.set(c, offset); offset += c.length; }
  // Downsample to targetRate (linear)
  const ratio = sampleRate / targetRate;
  const outLen = Math.floor(flat.length / ratio);
  const down = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const idx = i * ratio;
    const lo = Math.floor(idx); const hi = Math.min(lo + 1, flat.length - 1);
    const w = idx - lo;
    down[i] = flat[lo] * (1 - w) + flat[hi] * w;
  }
  // Encode 16-bit PCM WAV mono
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = targetRate * blockAlign;
  const dataSize = down.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);            // PCM
  view.setUint16(22, 1, true);            // mono
  view.setUint32(24, targetRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);           // bits per sample
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  let o = 44;
  for (let i = 0; i < down.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, down[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

// ---------- Component -------------------------------------------------------

export function VoiceBrain({ onClose, access, initialContext }: Props) {
  const [state, setState] = useState<PipelineState>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [partial, setPartial] = useState<string>("");   // live streaming speech text
  const [error, setError] = useState<string | null>(null);

  // Recorder refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const playbackRef = useRef<HTMLAudioElement | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const activeReqRef = useRef<AbortController | null>(null);

  // Auto-scroll
  useEffect(() => {
    const el = transcriptScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, partial]);

  // Cleanup on unmount
  useEffect(() => () => { void hardStop(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const hardStop = useCallback(async () => {
    try { activeReqRef.current?.abort(); } catch { /* noop */ }
    try { nodeRef.current?.disconnect(); } catch { /* noop */ }
    try { sourceRef.current?.disconnect(); } catch { /* noop */ }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    try { await audioCtxRef.current?.close(); } catch { /* noop */ }
    audioCtxRef.current = null; nodeRef.current = null; sourceRef.current = null; streamRef.current = null;
    try { playbackRef.current?.pause(); playbackRef.current = null; } catch { /* noop */ }
  }, []);

  const startRecording = useCallback(async () => {
    if (state === "recording" || state === "transcribing" || state === "thinking") return;
    setError(null);
    // Stop any current playback so the mic doesn't capture our own voice.
    try { playbackRef.current?.pause(); playbackRef.current = null; } catch { /* noop */ }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AC();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const node = ctx.createScriptProcessor(4096, 1, 1);
      nodeRef.current = node;
      chunksRef.current = [];
      node.onaudioprocess = (e) => {
        const ch = e.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(ch));
      };
      source.connect(node);
      node.connect(ctx.destination);
      setState("recording");
      console.log("[VoiceBrain] recording started");
    } catch (err) {
      console.error("[VoiceBrain] mic denied", err);
      setError("Mikrofon izni gerekli.");
      toast({ variant: "destructive" as any, title: "Mikrofon erişimi reddedildi" });
      setState("error");
    }
  }, [state]);

  const stopAndSend = useCallback(async () => {
    if (state !== "recording") return;
    const ctx = audioCtxRef.current;
    const sampleRate = ctx?.sampleRate ?? 48000;
    const chunks = chunksRef.current;
    // Detach recorder before async work so mic light turns off immediately.
    try { nodeRef.current?.disconnect(); } catch { /* noop */ }
    try { sourceRef.current?.disconnect(); } catch { /* noop */ }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    try { await audioCtxRef.current?.close(); } catch { /* noop */ }
    audioCtxRef.current = null; nodeRef.current = null; sourceRef.current = null; streamRef.current = null;

    const wav = encodeWav(chunks, sampleRate, 16000);
    console.log(`[VoiceBrain] recording stopped → wav ${wav.size} bytes`);
    if (wav.size < 3000) {
      toast({ title: "Ses çok kısa", description: "Tekrar deneyin." });
      setState("idle");
      return;
    }

    // ── 1. STT ─────────────────────────────────────────────────────────────
    setState("transcribing");
    let transcript = "";
    try {
      const { data: sess } = await supabase.auth.getSession();
      const jwt = sess?.session?.access_token ?? "";
      const form = new FormData();
      form.append("file", wav, "recording.wav");
      form.append("language", "tr");
      const sttRes = await fetch(`${SUPABASE_URL}/functions/v1/voice-stt`, {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}` },
        body: form,
      });
      const sttJson = await sttRes.json().catch(() => ({}));
      if (!sttRes.ok) throw new Error(sttJson?.error || `stt ${sttRes.status}`);
      transcript = String(sttJson?.text ?? "").trim();
      console.log("[VoiceBrain] transcript:", transcript);
      if (!transcript) {
        toast({ title: "Söylediğinizi anlayamadım", description: "Tekrar deneyin." });
        setState("idle");
        return;
      }
    } catch (err) {
      console.error("[VoiceBrain] STT failed", err);
      setError("Konuşma metne çevrilemedi.");
      setState("error");
      return;
    }

    // ── 2. Construction Brain ──────────────────────────────────────────────
    setState("thinking");
    setPartial("");
    let raw = "";
    try {
      const { data: sess } = await supabase.auth.getSession();
      const jwt = sess?.session?.access_token ?? "";
      const ac = new AbortController();
      activeReqRef.current = ac;
      // Rebuild the message history from previous turns so the Brain has
      // conversation memory (chat completions is stateless).
      const history = turns.flatMap((t) => ([
        { role: "user", content: t.userText },
        { role: "assistant", content: t.speech },
      ]));
      const messages = [
        ...(initialContext ? [{ role: "user" as const, content: initialContext }] : []),
        ...history,
        { role: "user" as const, content: transcript },
      ];
      // IMPORTANT: voice_mode is intentionally OMITTED so the full
      // SYSTEM_PROMPT (with the mandatory `ui` payload contract) is used.
      const brainRes = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ messages }),
        signal: ac.signal,
      });
      if (!brainRes.ok || !brainRes.body) {
        const j = await brainRes.json().catch(() => ({}));
        throw new Error(j?.error || `brain ${brainRes.status}`);
      }
      const reader = brainRes.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith("data:")) continue;
          const data = l.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json?.choices?.[0]?.delta?.content;
            if (typeof delta === "string") {
              raw += delta;
              // Update partial speech (strip ui blocks preview) — cheap enough.
              const preview = parseAIResponse(raw).speech;
              setPartial(preview);
            }
          } catch { /* partial JSON */ }
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") { setState("idle"); return; }
      console.error("[VoiceBrain] Brain failed", err);
      setError("Yanıt alınamadı.");
      setState("error");
      return;
    } finally {
      activeReqRef.current = null;
    }

    // ── 3. Parse {speech, ui} ─────────────────────────────────────────────
    const { speech, ui } = parseAIResponse(raw);
    const turn: Turn = { id: crypto.randomUUID(), userText: transcript, speech, ui, ts: Date.now() };
    setTurns((prev) => [...prev, turn]);
    setPartial("");
    console.log("[VoiceBrain] parsed speech:", speech);
    console.log("[VoiceBrain] parsed ui payloads:", ui);

    // ── 4. TTS (ElevenLabs, transport only) ───────────────────────────────
    if (!speech.trim()) { setState("idle"); return; }
    setState("speaking");
    try {
      const { data: sess } = await supabase.auth.getSession();
      const jwt = sess?.session?.access_token ?? "";
      const ttsRes = await fetch(`${SUPABASE_URL}/functions/v1/voice-tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        // Strip markdown before speaking so the voice doesn't read `**` etc.
        body: JSON.stringify({ text: stripMarkdown(speech) }),
      });
      if (!ttsRes.ok) throw new Error(`tts ${ttsRes.status}`);
      const blob = await ttsRes.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      playbackRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); playbackRef.current = null; setState("idle"); };
      audio.onerror = () => { URL.revokeObjectURL(url); playbackRef.current = null; setState("idle"); };
      await audio.play();
    } catch (err) {
      console.error("[VoiceBrain] TTS failed", err);
      // Text + UI still shown; just skip audio.
      setState("idle");
    }
  }, [state, turns, initialContext]);

  const cancel = useCallback(async () => {
    await hardStop();
    setState("idle");
    setPartial("");
  }, [hardStop]);

  const micLabel = useMemo(() => {
    switch (state) {
      case "recording": return "Dinliyor — bitirmek için dokunun";
      case "transcribing": return "Metne çevriliyor…";
      case "thinking": return "Şantiyem düşünüyor…";
      case "speaking": return "Cevap veriyor…";
      case "error": return "Hata";
      default: return "Konuşmak için dokunun";
    }
  }, [state]);

  const primaryDisabled = state === "transcribing" || state === "thinking";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div>
          <div className="text-sm font-semibold">Şantiyem AI</div>
          <div className="text-[11px] text-muted-foreground">Tek beyin: Chat + Ses</div>
        </div>
        <button onClick={() => { void hardStop(); onClose(); }} aria-label="Kapat" className="rounded-full p-2 hover:bg-muted/50">
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Conversation */}
      <div ref={transcriptScrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {turns.length === 0 && state === "idle" && (
          <div className="flex flex-col items-center justify-center gap-2 pt-10 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 opacity-50" />
            <p className="text-sm">Bir soru sorun — cevap ve görsel rapor birlikte gelecek.</p>
          </div>
        )}
        {turns.map((t) => (
          <div key={t.id} className="space-y-3">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground shadow-sm">
                {t.userText}
              </div>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-foreground">
              {t.speech && (
                <div className="rounded-2xl border border-border/60 bg-card/50 px-4 py-3 shadow-sm whitespace-pre-wrap">
                  {t.speech}
                </div>
              )}
              {t.ui.length > 0 && <AIResponseRenderer ui={t.ui} />}
            </div>
          </div>
        ))}
        {partial && (
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 px-4 py-3 whitespace-pre-wrap">
              {partial}
              <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-current align-middle" />
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
            {error}
          </div>
        )}
      </div>

      {/* Controls */}
      <footer className="border-t border-border/60 px-4 py-4">
        <div className="mx-auto flex max-w-md flex-col items-center gap-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{micLabel}</div>
          <div className="flex items-center gap-3">
            {state === "recording" ? (
              <>
                <button onClick={cancel} aria-label="İptal" className="grid h-12 w-12 place-items-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground">
                  <MicOff className="h-5 w-5" />
                </button>
                <button onClick={stopAndSend} aria-label="Gönder" className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg voice-orb-ring">
                  <Square className="h-6 w-6" />
                </button>
              </>
            ) : (
              <button
                onClick={startRecording}
                disabled={primaryDisabled || !access.hasAccess}
                aria-label="Kaydı Başlat"
                className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg disabled:opacity-50"
              >
                {primaryDisabled ? <Loader2 className="h-6 w-6 animate-spin" /> : <Mic className="h-6 w-6" />}
              </button>
            )}
          </div>
          {!access.hasAccess && (
            <div className="text-[11px] text-muted-foreground">Sesli asistan için premium plan gerekli.</div>
          )}
        </div>
      </footer>
    </div>
  );
}

// Best-effort markdown → plain text so TTS reads naturally.
function stripMarkdown(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, "")            // code fences (incl. json ui if any leaked)
    .replace(/::\/?[a-z_]+[^\n]*/gi, "")       // ::block markers
    .replace(/[*_`>#~]+/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")   // links → label
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default VoiceBrain;
