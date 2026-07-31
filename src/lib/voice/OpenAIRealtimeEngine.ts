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
import { VoiceMetricsTracker } from "./voiceMetrics";
import type { VoiceEngineConfig, VoiceProviderId, VoiceToolCall } from "./voiceTypes";

type SessionInfo = {
  client_secret: string;
  model: string;
  voice: string;
  base_url?: string;
};

/** Always-on runtime trace for the realtime transport. */
const RT = "[voice:rt]";
function rtLog(msg: string, data?: unknown) {
  if (data === undefined) console.log(`${RT} ${msg}`);
  else console.log(`${RT} ${msg}`, data);
}

/** No OpenAI event at all within this window = the session never came up. */
const NO_EVENT_TIMEOUT_MS = 5000;
/** Fallback if `session.updated` never arrives after `session.created`. */
const SESSION_READY_FALLBACK_MS = 800;

export class OpenAIRealtimeEngine extends BaseVoiceEngine {
  readonly provider: VoiceProviderId = "openai-realtime";

  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private micStream: MediaStream | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private reconnects = 0;
  private closing = false;
  private assistantBuffer = "";
  private metrics = new VoiceMetricsTracker();
  private analyser: AnalyserNode | null = null;
  private audioCtx: AudioContext | null = null;
  private levelBuf: Uint8Array<ArrayBuffer> | null = null;
  private outAnalyser: AnalyserNode | null = null;
  private outBuf: Uint8Array<ArrayBuffer> | null = null;
  private speaking = false;
  /** true only after `session.created` — gates the "listening" state. */
  private sessionReady = false;
  private eventCount = 0;
  private noEventTimer: number | null = null;
  private readyFallbackTimer: number | null = null;
  private statsTimer: number | null = null;
  private lastBytesSent = 0;
  private silentUplinkChecks = 0;

  getMetrics() { return this.metrics.snapshot(); }


  getMicLevel(): number {
    if (!this.analyser || !this.levelBuf) return 0;
    this.analyser.getByteTimeDomainData(this.levelBuf);
    let peak = 0;
    for (let i = 0; i < this.levelBuf.length; i++) {
      const v = Math.abs(this.levelBuf[i] - 128) / 128;
      if (v > peak) peak = v;
    }
    return Math.min(1, peak * 1.8);
  }

  /** 0..1 realtime energy of the assistant's outgoing audio. */
  getOutputLevel(): number {
    if (!this.outAnalyser || !this.outBuf) return 0;
    this.outAnalyser.getByteTimeDomainData(this.outBuf);
    let peak = 0;
    for (let i = 0; i < this.outBuf.length; i++) {
      const v = Math.abs(this.outBuf[i] - 128) / 128;
      if (v > peak) peak = v;
    }
    return Math.min(1, peak * 2.2);
  }

  // ---------- lifecycle ----------------------------------------------------

  async connect(config: VoiceEngineConfig = {}): Promise<void> {
    this.config = { maxReconnects: 2, ...this.config, ...config };
    this.closing = false;
    this.sessionReady = false;
    this.eventCount = 0;
    this.setState("mic_setup");
    this.metrics.startSession();
    rtLog("connect() start — requesting microphone");

    try {
      const session = await this.mintSession();
      await this.openPeerConnection(session);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Microphone denial is a permission problem, never a transport
      // problem — no reconnect attempts, no provider switching.
      if (msg.includes("audio_device_unavailable")) {
        await this.teardown();
        this.emitError("audio_device_unavailable", msg, true, "mic_permission");
        return;
      }
      this.emitError("connect_failed", msg, true);
      await this.retryOrFail(msg);
    }
  }

  private async mintSession(): Promise<SessionInfo> {
    const { data: sess } = await supabase.auth.getSession();
    const jwt = sess?.session?.access_token ?? "";
    const t0 = performance.now();
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
    rtLog(`token endpoint → ${res.status} in ${Math.round(performance.now() - t0)}ms`, {
      hasSecret: Boolean(json?.client_secret), model: json?.model, voice: json?.voice,
    });
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
    pc.ontrack = (e) => {
      rtLog("pc.ontrack — remote audio attached", { kind: e.track.kind, id: e.track.id });
      audio.srcObject = e.streams[0];
      void audio.play().catch((err) => rtLog("remote audio play() rejected", String(err)));
      this.attachOutputMeter(e.streams[0]);
    };

    // Uplink: microphone.
    let mic: MediaStream;
    try {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (err) {
      throw new Error(`audio_device_unavailable: ${err instanceof Error ? err.message : String(err)}`);
    }
    this.micStream = mic;
    rtLog("microphone acquired", mic.getAudioTracks().map((t) => ({
      label: t.label, enabled: t.enabled, muted: t.muted, state: t.readyState,
    })));
    this.attachLevelMeter(mic);
    for (const track of mic.getTracks()) pc.addTrack(track, mic);

    // Transport is up next — token + WebRTC handshake.
    this.setState("connecting");

    // Control channel.
    const dc = pc.createDataChannel("oai-events");
    this.dc = dc;
    dc.onopen = () => {
      rtLog(`data channel "oai-events" OPEN (readyState=${dc.readyState})`);
      logger.debug("[voice:openai] data channel open");
      this.metrics.markConnected();
      // NOT "listening" yet — we wait for session.created from OpenAI.
      this.armNoEventWatchdog();
      this.sendEvent({
        type: "session.update",
        session: {
          type: "realtime",
          audio: {
            input: {
              transcription: { model: "gpt-4o-mini-transcribe", language: this.config.language ?? "tr" },
              turn_detection: { type: "semantic_vad", interrupt_response: true },
            },
          },
        },
      });
    };
    dc.onmessage = (e) => this.handleServerEvent(e.data);
    dc.onerror = (e) => rtLog("data channel ERROR", e);
    dc.onclose = () => {
      rtLog("data channel CLOSED");
      if (!this.closing) void this.retryOrFail("data_channel_closed");
    };

    pc.onconnectionstatechange = () => {
      rtLog(`pc.connectionState → ${pc.connectionState}`);
      if (this.closing) return;
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        void this.retryOrFail(`pc_${pc.connectionState}`);
      }
    };
    pc.oniceconnectionstatechange = () => rtLog(`pc.iceConnectionState → ${pc.iceConnectionState}`);
    pc.onicegatheringstatechange = () => rtLog(`pc.iceGatheringState → ${pc.iceGatheringState}`);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const base = session.base_url ?? "https://api.openai.com/v1/realtime/calls";
    const t0 = performance.now();
    const sdpRes = await fetch(`${base}?model=${encodeURIComponent(session.model)}`, {
      method: "POST",
      body: offer.sdp ?? "",
      headers: {
        Authorization: `Bearer ${session.client_secret}`,
        "Content-Type": "application/sdp",
      },
    });
    rtLog(`SDP exchange → ${sdpRes.status} in ${Math.round(performance.now() - t0)}ms`);
    if (!sdpRes.ok) throw new Error(`sdp_${sdpRes.status}: ${(await sdpRes.text()).slice(0, 200)}`);
    const answer = await sdpRes.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answer });
    this.reconnects = 0;
    // Even if the data channel never opens, we must not hang forever.
    this.armNoEventWatchdog();
    this.startUplinkStats();
  }

  // ---------- runtime guards ----------------------------------------------

  /**
   * If OpenAI sends no event at all within 5s, the session never came up.
   * Fail loudly instead of leaving the UI on "Dinliyorum" forever.
   */
  private armNoEventWatchdog() {
    if (this.noEventTimer !== null) return;
    this.noEventTimer = window.setTimeout(() => {
      this.noEventTimer = null;
      if (this.closing || this.sessionReady || this.eventCount > 0) return;
      rtLog(`no OpenAI event in ${NO_EVENT_TIMEOUT_MS}ms`, {
        dc: this.dc?.readyState ?? "none",
        pc: this.pc?.connectionState ?? "none",
        ice: this.pc?.iceConnectionState ?? "none",
      });
      void this.failNoEvents();
    }, NO_EVENT_TIMEOUT_MS);
  }

  private async failNoEvents() {
    await this.teardown();
    this.emitError("openai_no_events", "OpenAI bağlantısı kurulamadı", true, "connection");
  }

  private clearTimers() {
    if (this.noEventTimer !== null) { window.clearTimeout(this.noEventTimer); this.noEventTimer = null; }
    if (this.readyFallbackTimer !== null) { window.clearTimeout(this.readyFallbackTimer); this.readyFallbackTimer = null; }
    if (this.statsTimer !== null) { window.clearInterval(this.statsTimer); this.statsTimer = null; }
  }

  /** Proves the microphone uplink is really shipping RTP packets. */
  private startUplinkStats() {
    if (this.statsTimer !== null) return;
    this.lastBytesSent = 0;
    this.silentUplinkChecks = 0;
    this.statsTimer = window.setInterval(async () => {
      const pc = this.pc;
      if (!pc) return;
      try {
        const stats = await pc.getStats();
        stats.forEach((r: RTCStats & { kind?: string; bytesSent?: number; packetsSent?: number }) => {
          if (r.type !== "outbound-rtp" || r.kind !== "audio") return;
          const bytes = r.bytesSent ?? 0;
          const delta = bytes - this.lastBytesSent;
          this.lastBytesSent = bytes;
          rtLog(`mic uplink: packetsSent=${r.packetsSent ?? 0} bytesSent=${bytes} (+${delta})`);
          if (delta <= 0 && !this.isMuted()) {
            this.silentUplinkChecks += 1;
            if (this.silentUplinkChecks === 3) {
              console.warn(`${RT} microphone uplink appears silent — no RTP bytes sent`);
            }
          } else {
            this.silentUplinkChecks = 0;
          }
        });
      } catch { /* stats are best-effort */ }
    }, 2000);
  }


  /**
   * Reconnects up to `maxReconnects` times, then ends the session in an
   * explicit error state. No other provider is ever initialized.
   */
  private async retryOrFail(reason: string) {
    if (this.closing) return;
    const max = this.config.maxReconnects ?? 2;
    if (this.reconnects < max) {
      this.reconnects += 1;
      this.metrics.markReconnect();
      this.setState("connecting");
      logger.debug(`[voice:openai] reconnect ${this.reconnects}/${max} (${reason})`);
      await this.teardown();
      await new Promise((r) => setTimeout(r, 600 * this.reconnects));
      await this.connect(this.config);
      return;
    }
    await this.teardown();
    this.emitError("connection_lost", reason, true, "connection_lost");
  }

  // ---------- server events ------------------------------------------------

  private handleServerEvent(raw: string) {
    let evt: Record<string, unknown>;
    try { evt = JSON.parse(raw); } catch { return; }
    const type = String(evt.type ?? "");

    // Every OpenAI event is traced; the watchdog only cares that one arrived.
    this.eventCount += 1;
    rtLog(`⬅ ${type}`, type === "error" ? evt.error ?? evt : undefined);
    if (this.noEventTimer !== null) {
      window.clearTimeout(this.noEventTimer);
      this.noEventTimer = null;
    }

    switch (type) {
      case "session.created":
        // The realtime session exists — this is the real readiness signal.
        this.sessionReady = true;
        this.setState("ready");
        if (this.readyFallbackTimer === null) {
          this.readyFallbackTimer = window.setTimeout(() => {
            this.readyFallbackTimer = null;
            if (!this.closing && this.state === "ready") this.goListening();
          }, SESSION_READY_FALLBACK_MS);
        }
        break;
      case "session.updated":
        this.goListening();
        break;

      case "input_audio_buffer.speech_started":
        // Barge-in: kill assistant audio instantly and resume listening.
        if (this.speaking || this.state === "speaking") this.stopPlayback();
        this.metrics.markTurnStart();
        this.goListening();
        break;

      case "output_audio_buffer.started":
        this.speaking = true;
        this.metrics.markFirstAudio();
        this.setState("speaking");
        break;
      case "output_audio_buffer.stopped":
      case "output_audio_buffer.cleared":
        this.speaking = false;
        break;
      case "conversation.item.input_audio_transcription.delta":
        this.metrics.markFirstTranscript();
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
        this.metrics.markFirstToken();
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
        this.speaking = false;
        this.metrics.resetTurn();
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
    this.stopPlayback();
  }

  /** Cancel in-flight response, flush queued audio, resume listening. */
  private stopPlayback() {
    this.sendEvent({ type: "response.cancel" });
    this.sendEvent({ type: "output_audio_buffer.clear" });
    this.assistantBuffer = "";
    this.speaking = false;
    this.setState("interrupted");
    this.setState("listening");
  }

  private attachLevelMeter(stream: MediaStream) {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      this.audioCtx = ctx;
      this.analyser = analyser;
      this.levelBuf = new Uint8Array(new ArrayBuffer(analyser.fftSize));
    } catch { /* level meter is best-effort */ }
  }

  /** Analyses the assistant's audio so the orb can react to real energy. */
  private attachOutputMeter(stream: MediaStream) {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = this.audioCtx ?? new Ctx();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      this.audioCtx = ctx;
      this.outAnalyser = analyser;
      this.outBuf = new Uint8Array(new ArrayBuffer(analyser.fftSize));
    } catch { /* best-effort */ }
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
    try { void this.audioCtx?.close(); } catch { /* noop */ }
    this.analyser = null; this.levelBuf = null; this.audioCtx = null; this.speaking = false;
    this.outAnalyser = null; this.outBuf = null;
    this.dc = null; this.pc = null; this.micStream = null; this.audioEl = null;
  }
}

function safeJson(s: string): Record<string, unknown> {
  try { return JSON.parse(s) as Record<string, unknown>; } catch { return {}; }
}
