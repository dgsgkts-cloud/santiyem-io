// ============================================================
// src/lib/voice/OpenAIRealtimeEngine.ts
// OpenAI Realtime (WebRTC) implementation of the VoiceEngine contract.
//
// Flow: edge function mints an ephemeral client secret →
//       browser opens a WebRTC peer connection (mic uplink, audio downlink)
//       → data channel carries transcripts, tool calls and control events.
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { BaseVoiceEngine } from "./BaseVoiceEngine";
import { OPENAI_REALTIME } from "./voiceConfig";
import type { VoiceEngineConfig, VoiceProviderId, VoiceToolCall } from "./voiceTypes";

type SessionInfo = {
  client_secret: string;
  model: string;
  voice: string;
  base_url?: string;
};

export class OpenAIRealtimeEngine extends BaseVoiceEngine {
  readonly provider: VoiceProviderId = "openai-realtime";

  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private micStream: MediaStream | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private reconnects = 0;
  private closing = false;
  private assistantBuffer = "";

  // ---------- lifecycle ----------------------------------------------------

  async connect(config: VoiceEngineConfig = {}): Promise<void> {
    this.config = { maxReconnects: 2, ...this.config, ...config };
    this.closing = false;
    this.setState("connecting");

    try {
      const session = await this.mintSession();
      await this.openPeerConnection(session);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.emitError("connect_failed", msg, true);
      await this.retryOrFallback(msg);
    }
  }

  private async mintSession(): Promise<SessionInfo> {
    const { data: sess } = await supabase.auth.getSession();
    const jwt = sess?.session?.access_token ?? "";
    const res = await fetch(OPENAI_REALTIME.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({
        instructions: this.config.instructionsSuffix ?? "",
        tools: this.config.tools ?? [],
        voice: this.config.voice ?? OPENAI_REALTIME.voice,
        model: this.config.model ?? OPENAI_REALTIME.model,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ? `${json.error}` : `token_${res.status}`);
    if (!json?.client_secret) throw new Error("missing_client_secret");
    return json as SessionInfo;
  }

  private async openPeerConnection(session: SessionInfo) {
    const pc = new RTCPeerConnection();
    this.pc = pc;

    // Downlink: remote audio.
    const audio = new Audio();
    audio.autoplay = true;
    audio.volume = this.config.volume ?? 1;
    this.audioEl = audio;
    pc.ontrack = (e) => { audio.srcObject = e.streams[0]; };

    // Uplink: microphone.
    const mic = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    this.micStream = mic;
    for (const track of mic.getTracks()) pc.addTrack(track, mic);

    // Control channel.
    const dc = pc.createDataChannel("oai-events");
    this.dc = dc;
    dc.onopen = () => {
      logger.debug("[voice:openai] data channel open");
      this.setState("listening");
      this.sendEvent({ type: "session.update", session: { turn_detection: { type: "server_vad" } } });
    };
    dc.onmessage = (e) => this.handleServerEvent(e.data);
    dc.onclose = () => { if (!this.closing) void this.retryOrFallback("data_channel_closed"); };

    pc.onconnectionstatechange = () => {
      if (this.closing) return;
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        void this.retryOrFallback(`pc_${pc.connectionState}`);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const base = session.base_url ?? "https://api.openai.com/v1/realtime/calls";
    const sdpRes = await fetch(`${base}?model=${encodeURIComponent(session.model)}`, {
      method: "POST",
      body: offer.sdp ?? "",
      headers: {
        Authorization: `Bearer ${session.client_secret}`,
        "Content-Type": "application/sdp",
      },
    });
    if (!sdpRes.ok) throw new Error(`sdp_${sdpRes.status}: ${(await sdpRes.text()).slice(0, 200)}`);
    const answer = await sdpRes.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answer });
    this.reconnects = 0;
  }

  private async retryOrFallback(reason: string) {
    if (this.closing) return;
    const max = this.config.maxReconnects ?? 2;
    if (this.reconnects < max) {
      this.reconnects += 1;
      logger.debug(`[voice:openai] reconnect ${this.reconnects}/${max} (${reason})`);
      await this.teardown();
      await new Promise((r) => setTimeout(r, 600 * this.reconnects));
      await this.connect(this.config);
      return;
    }
    await this.teardown();
    this.setState("disconnected");
    this.emitFallback(reason);
  }

  // ---------- server events ------------------------------------------------

  private handleServerEvent(raw: string) {
    let evt: Record<string, unknown>;
    try { evt = JSON.parse(raw); } catch { return; }
    const type = String(evt.type ?? "");

    switch (type) {
      case "input_audio_buffer.speech_started":
        this.setState("listening");
        break;
      case "conversation.item.input_audio_transcription.delta":
        this.emitTranscript({
          id: String(evt.item_id ?? "u"), role: "user",
          text: String(evt.delta ?? ""), final: false, ts: Date.now(),
        });
        break;
      case "conversation.item.input_audio_transcription.completed":
        this.emitTranscript({
          id: String(evt.item_id ?? "u"), role: "user",
          text: String(evt.transcript ?? ""), final: true, ts: Date.now(),
        });
        this.setState("thinking");
        break;
      case "response.output_audio_transcript.delta":
      case "response.audio_transcript.delta":
        this.assistantBuffer += String(evt.delta ?? "");
        this.setState("speaking");
        this.emitTranscript({
          id: String(evt.response_id ?? "a"), role: "assistant",
          text: this.assistantBuffer, final: false, ts: Date.now(),
        });
        break;
      case "response.output_audio_transcript.done":
      case "response.audio_transcript.done": {
        const text = String(evt.transcript ?? this.assistantBuffer);
        this.emitTranscript({
          id: String(evt.response_id ?? "a"), role: "assistant", text, final: true, ts: Date.now(),
        });
        this.emitter.emit("response", { text, ts: Date.now() });
        this.assistantBuffer = "";
        break;
      }
      case "response.function_call_arguments.done":
        void this.runTool({
          callId: String(evt.call_id ?? ""),
          name: String(evt.name ?? ""),
          args: safeJson(String(evt.arguments ?? "{}")),
        });
        break;
      case "response.done":
        if (this.state !== "listening") this.setState("listening");
        break;
      case "error":
        this.emitError("server_error", JSON.stringify(evt.error ?? evt).slice(0, 300));
        break;
      default:
        break;
    }
  }

  private async runTool(call: VoiceToolCall) {
    if (!call.name) return;
    this.emitter.emit("toolCall", call);
    const result = this.config.onToolCall
      ? await this.config.onToolCall(call)
      : ({ ok: false, error: "no_executor" } as const);
    this.sendEvent({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: call.callId,
        output: JSON.stringify(result),
      },
    });
    this.sendEvent({ type: "response.create" });
  }

  private sendEvent(payload: Record<string, unknown>) {
    if (this.dc?.readyState !== "open") return;
    try { this.dc.send(JSON.stringify(payload)); } catch { /* noop */ }
  }

  // ---------- controls -----------------------------------------------------

  startListening() {
    this.unmute();
    if (this.isConnected()) this.setState("listening");
  }

  stopListening() {
    this.mute();
  }

  mute() {
    this.muted = true;
    this.micStream?.getAudioTracks().forEach((t) => { t.enabled = false; });
  }

  unmute() {
    this.muted = false;
    this.micStream?.getAudioTracks().forEach((t) => { t.enabled = true; });
  }

  sendText(text: string) {
    const clean = text.trim();
    if (!clean) return;
    this.sendEvent({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text", text: clean }] },
    });
    this.sendEvent({ type: "response.create" });
    this.setState("thinking");
  }

  interrupt() {
    this.sendEvent({ type: "response.cancel" });
    this.assistantBuffer = "";
    this.setState("interrupted");
    if (this.audioEl) { try { this.audioEl.pause(); this.audioEl.currentTime = 0; } catch { /* noop */ } }
    this.setState("listening");
  }

  setVolume(v: number) {
    this.config.volume = v;
    if (this.audioEl) this.audioEl.volume = Math.max(0, Math.min(1, v));
  }

  async disconnect(): Promise<void> {
    this.closing = true;
    await this.teardown();
    this.setState("disconnected");
  }

  private async teardown() {
    try { this.dc?.close(); } catch { /* noop */ }
    try { this.pc?.getSenders().forEach((s) => s.track?.stop()); } catch { /* noop */ }
    try { this.pc?.close(); } catch { /* noop */ }
    try { this.micStream?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    try { this.audioEl?.pause(); } catch { /* noop */ }
    this.dc = null; this.pc = null; this.micStream = null; this.audioEl = null;
  }
}

function safeJson(s: string): Record<string, unknown> {
  try { return JSON.parse(s) as Record<string, unknown>; } catch { return {}; }
}
