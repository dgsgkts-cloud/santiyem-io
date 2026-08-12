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
import { MIC_AUDIO_CONSTRAINTS } from "./micPermission";

import { setVoiceDiagnostics } from "./voiceDiagnostics";
import { VoiceMetricsTracker } from "./voiceMetrics";
import { isVoiceErrorRetryable } from "./voiceTypes";
import type { VoiceEngineConfig, VoiceErrorKind, VoiceProviderId, VoiceToolCall } from "./voiceTypes";

/**
 * A classified handshake failure. `retryable === false` means the problem is
 * permanent (auth, quota, model/session configuration) and auto-reconnecting
 * would only repeat the same failure.
 */
class VoiceFailure extends Error {
  constructor(
    readonly code: string,
    readonly kind: VoiceErrorKind,
    readonly retryable: boolean,
    message?: string,
  ) {
    super(message ?? code);
  }
}

/** Maps an HTTP status (+ optional provider error code) to a voice error kind. */
function classifyHttp(status: number, providerCode?: string): { kind: VoiceErrorKind; retryable: boolean } {
  if (providerCode && /insufficient_quota|billing/i.test(providerCode)) return { kind: "quota", retryable: false };
  if (status === 401 || status === 403) return { kind: "auth", retryable: false };
  if (status === 400 || status === 404 || status === 422) return { kind: "config", retryable: false };
  if (status === 429) return { kind: "quota", retryable: false };
  if (status === 408 || status === 504) return { kind: "timeout", retryable: true };
  return { kind: "connection", retryable: true };
}

/** Hard ceiling for each network leg of the handshake. */
const HANDSHAKE_TIMEOUT_MS = 12000;

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

// ---- controlled barge-in tuning -------------------------------------------
/** Microphone level polling interval while the assistant speaks. */
const BARGE_IN_SAMPLE_MS = 50;
/**
 * Continuous voice activity required before an interruption is accepted.
 * A short "hmm", cough or keyboard tap never lasts this long, so it can
 * never cut the answer off.
 */
const BARGE_IN_SUSTAIN_MS = 650;
/** Absolute floor: below this nothing is ever treated as speech. */
const BARGE_IN_MIN_LEVEL = 0.1;
/** Speech must exceed the measured noise floor by this factor. */
const BARGE_IN_NOISE_FACTOR = 2.6;
/** …and by at least this absolute margin. */
const BARGE_IN_NOISE_MARGIN = 0.07;
/** After this window without sustained speech the barge-in attempt is dropped. */
const BARGE_IN_WINDOW_MS = 2000;
/** Exponential smoothing applied to the ambient noise floor estimate. */
const NOISE_FLOOR_ALPHA = 0.05;



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
  /** True once `session.created` has ever been received in this engine's life. */
  private everEstablished = false;
  private eventCount = 0;
  private noEventTimer: number | null = null;
  private readyFallbackTimer: number | null = null;
  private statsTimer: number | null = null;
  private lastBytesSent = 0;
  private silentUplinkChecks = 0;

  // ---- interruption / response bookkeeping --------------------------------
  /** Id of the response currently being generated (null when none). */
  private activeResponseId: string | null = null;
  /** Responses we cancelled — every late event from them is ignored. */
  private cancelledResponseIds = new Set<string>();
  /** Latest assistant audio item, needed for conversation.item.truncate. */
  private lastAssistantItemId: string | null = null;
  /** Wall clock at which the current assistant playback started. */
  private playbackStartedAt: number | null = null;
  /** Prevents duplicate response.create while one is already in flight. */
  private responseCreatePending = false;
  /** Sustained-speech watch used to confirm a real barge-in. */
  private bargeInTimer: number | null = null;
  private bargeInSamples = 0;
  private bargeInElapsed = 0;
  private interruptionPending = false;
  /** Rolling estimate of the ambient microphone noise floor (0..1). */
  private noiseFloor = 0.02;
  /** Continuously updated while a session is live, cheap and lock-free. */
  private noiseFloorTimer: number | null = null;



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
      // Permanent failures (auth, quota, model/session config) must never be
      // auto-retried — retrying just reproduces the same rejection.
      if (err instanceof VoiceFailure && !err.retryable) {
        rtLog(`permanent failure — no auto-retry (${err.code})`);
        await this.teardown();
        this.emitError(err.code, err.message, true, err.kind);
        return;
      }
      const kind: VoiceErrorKind = err instanceof VoiceFailure ? err.kind : "connection";
      rtLog(`recoverable failure (${msg})`);
      await this.retryOrFail(msg, kind);
    }
  }

  private async mintSession(): Promise<SessionInfo> {
    const { data: sess } = await supabase.auth.getSession();
    const jwt = sess?.session?.access_token ?? "";
    const t0 = performance.now();
    rtLog("token/session request started", { url: OPENAI_REALTIME.tokenEndpoint });
    const res = await fetch(OPENAI_REALTIME.tokenEndpoint, {
      method: "POST",
      signal: AbortSignal.timeout(HANDSHAKE_TIMEOUT_MS),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({
        instructions: this.config.instructionsSuffix ?? "",
        tools: this.config.tools ?? [],
        voice: this.config.voice ?? OPENAI_REALTIME.voice,
        // No model is sent: the edge function is the single source of truth.
      }),
    });
    const json = await res.json().catch(() => ({}));
    rtLog(`token endpoint → ${res.status} in ${Math.round(performance.now() - t0)}ms`, {
      url: OPENAI_REALTIME.tokenEndpoint,
      stage: json?.stage,
      code: json?.code,
      hasSecret: Boolean(json?.client_secret), model: json?.model, voice: json?.voice,
    });
    if (!res.ok) {
      const providerCode = String(json?.code ?? json?.error ?? "");
      const { kind, retryable } = classifyHttp(res.status, providerCode);
      throw new VoiceFailure(`session_${res.status}_${providerCode || "unknown"}`, kind, retryable);
    }
    if (!json?.client_secret) {
      throw new VoiceFailure("missing_client_secret", "config", false);
    }
    // The server owns the model; an empty/missing value is a configuration error.
    const resolvedModel = typeof json?.model === "string" ? json.model.trim() : "";
    if (!resolvedModel) throw new VoiceFailure("realtime_model_not_configured", "config", false);
    setVoiceDiagnostics({
      model: resolvedModel,
      modelSource: typeof json?.model_source === "string" ? json.model_source : null,
      connectionMethod: "webrtc",
      lastErrorCode: null,
    });
    // Structured, once-per-session config log (never repeated on audio events).
    logger.debug(`[voice:rt] resolved config ${JSON.stringify({
      model: resolvedModel, source: json?.model_source ?? "unknown",
    })}`);
    rtLog("token/session success", { model: resolvedModel, voice: json.voice, expiresAt: json.expires_at ?? null });
    return { ...(json as SessionInfo), model: resolvedModel };
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

    // Uplink: microphone. This is the ONLY getUserMedia call in the voice
    // stack, and it runs solely because the user started a session.
    let mic: MediaStream;
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: MIC_AUDIO_CONSTRAINTS });
    } catch (err) {

      throw new Error(`audio_device_unavailable: ${err instanceof Error ? err.message : String(err)}`);
    }
    this.micStream = mic;
    rtLog("mic acquired", mic.getAudioTracks().map((t) => ({
      label: t.label, enabled: t.enabled, muted: t.muted, state: t.readyState,
    })));
    this.attachLevelMeter(mic);
    this.startNoiseFloorTracking();

    for (const track of mic.getTracks()) pc.addTrack(track, mic);

    // Transport is up next — token + WebRTC handshake.
    this.setState("connecting");

    // Control channel.
    const dc = pc.createDataChannel("oai-events");
    this.dc = dc;
    dc.onopen = () => {
      rtLog(`data channel OPEN (oai-events, readyState=${dc.readyState})`);
      setVoiceDiagnostics({ dataChannelState: dc.readyState });
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
              // Provider-side noise reduction: room/laptop microphones by
              // default, close-talk only when explicitly configured.
              noise_reduction: { type: this.config.micProximity ?? "far_field" },
              // Semantic VAD with low eagerness: a short pause is not a turn
              // end. `interrupt_response: false` stops any single VAD start
              // event from killing the answer — real barge-in is confirmed
              // client-side (see confirmInterrupt) and then cancelled explicitly.
              turn_detection: {
                type: "semantic_vad",
                eagerness: "low",
                create_response: true,
                interrupt_response: false,
              },
            },
          },
        },
      });

    };
    dc.onmessage = (e) => this.handleServerEvent(e.data);
    dc.onerror = (e) => rtLog("data channel ERROR", e);
    dc.onclose = () => {
      rtLog("data channel CLOSED");
      setVoiceDiagnostics({ dataChannelState: "closed" });
      if (!this.closing) void this.retryOrFail("data_channel_closed", "connection_lost");
    };

    pc.onconnectionstatechange = () => {
      rtLog(`pc.connectionState → ${pc.connectionState}`);
      if (this.closing) return;
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        void this.retryOrFail(`pc_${pc.connectionState}`, "connection_lost");
      }
    };
    pc.oniceconnectionstatechange = () => rtLog(`pc.iceConnectionState → ${pc.iceConnectionState}`);
    pc.onicegatheringstatechange = () => rtLog(`pc.iceGatheringState → ${pc.iceGatheringState}`);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    rtLog("offer created", { hasAudioSection: /m=audio/.test(offer.sdp ?? "") });
    rtLog("local description set");

    const base = session.base_url ?? "https://api.openai.com/v1/realtime/calls";
    // The call must open with the exact model the client secret was minted for.
    const callModel = session.model;
    if (!callModel || callModel !== session.model) {
      rtLog("model mismatch between client secret and realtime call", {
        secretModel: session.model, callModel,
      });
      throw new VoiceFailure("realtime_model_mismatch", "config", false);
    }
    const sdpUrl = `${base}?model=${encodeURIComponent(callModel)}`;
    const t0 = performance.now();
    let sdpRes: Response;
    try {
      sdpRes = await fetch(sdpUrl, {
        method: "POST",
        body: offer.sdp ?? "",
        signal: AbortSignal.timeout(HANDSHAKE_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${session.client_secret}`,
          "Content-Type": "application/sdp",
        },
      });
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === "TimeoutError";
      rtLog("SDP exchange FAILED (network)", { url: sdpUrl, timedOut });
      throw new VoiceFailure(
        timedOut ? "sdp_timeout" : "sdp_network_error",
        timedOut ? "timeout" : "connection",
        true,
      );
    }
    const answer = await sdpRes.text();
    rtLog(`SDP exchange → ${sdpRes.status} in ${Math.round(performance.now() - t0)}ms`, {
      url: sdpUrl, model: callModel, preview: answer.slice(0, 60),
    });
    if (!sdpRes.ok) {
      // Surface the provider's machine-readable code (never the raw body to users).
      let providerCode = "";
      try { providerCode = String(JSON.parse(answer)?.error?.code ?? ""); } catch { /* non-JSON */ }
      rtLog("SDP exchange rejected", { status: sdpRes.status, providerCode });
      const { kind, retryable } = classifyHttp(sdpRes.status, providerCode);
      throw new VoiceFailure(`sdp_${sdpRes.status}_${providerCode || "unknown"}`, kind, retryable);
    }
    // A 2xx is not proof of SDP — validate the payload before handing it to WebRTC.
    if (!answer.trimStart().startsWith("v=0")) {
      rtLog("SDP answer malformed", { preview: answer.slice(0, 60) });
      throw new VoiceFailure("sdp_answer_malformed", "config", false);
    }
    await pc.setRemoteDescription({ type: "answer", sdp: answer });
    rtLog("remote description set");
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
    this.emitError("openai_no_events", "session.created never arrived", true, "session_not_started");
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
  private async retryOrFail(reason: string, kind: VoiceErrorKind = "connection_lost") {
    if (this.closing) return;
    if (!isVoiceErrorRetryable(kind)) {
      await this.teardown();
      this.emitError(reason, reason, true, kind);
      return;
    }
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
    // "Bağlantı kesildi" is only truthful once a session actually existed.
    this.emitError(
      "connection_lost",
      reason,
      true,
      this.everEstablished ? "connection_lost" : kind,
    );
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

    // Late events from a response we already cancelled must never leak into
    // the next answer (stale audio / transcript deltas).
    const eventResponseId = this.eventResponseId(evt);
    if (eventResponseId && this.cancelledResponseIds.has(eventResponseId)) {
      rtLog(`ignored stale event from cancelled response ${eventResponseId}`, type);
      return;
    }

    switch (type) {
      case "session.created":
        // The realtime session exists — this is the real readiness signal.
        this.sessionReady = true;
        this.everEstablished = true;
        rtLog("state ready");
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
        this.metrics.markTurnStart();
        if (this.speaking || this.state === "speaking") {
          // NOT an interruption yet: a cough, keyboard click or door noise
          // fires this too. Only sustained speech may cut the answer off.
          this.beginBargeInWatch();
        } else {
          this.goListening();
        }
        break;
      case "input_audio_buffer.speech_stopped":
        // Transient noise ended before it qualified as a real barge-in.
        if (this.interruptionPending) this.cancelBargeInWatch();
        break;

      case "response.created":
        this.responseCreatePending = false;
        this.activeResponseId = eventResponseId;
        break;
      case "response.output_item.added": {
        const item = evt.item as { id?: string } | undefined;
        if (item?.id) this.lastAssistantItemId = item.id;
        break;
      }

      case "output_audio_buffer.started":
        this.speaking = true;
        this.playbackStartedAt = Date.now();
        this.metrics.markFirstAudio();
        this.setState("speaking");
        break;
      case "output_audio_buffer.stopped":
      case "output_audio_buffer.cleared":
        this.speaking = false;
        this.playbackStartedAt = null;
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
        this.playbackStartedAt = null;
        this.activeResponseId = null;
        this.responseCreatePending = false;
        this.cancelBargeInWatch();
        this.metrics.resetTurn();
        if (this.state !== "listening") this.goListening();
        break;
      case "error":
        this.responseCreatePending = false;
        this.emitError("server_error", JSON.stringify(evt.error ?? evt).slice(0, 300));
        break;
      default:
        break;
    }
  }

  /** Extracts the response id an event belongs to, if any. */
  private eventResponseId(evt: Record<string, unknown>): string | null {
    const direct = evt.response_id;
    if (typeof direct === "string" && direct) return direct;
    const nested = (evt.response as { id?: string } | undefined)?.id;
    return typeof nested === "string" && nested ? nested : null;
  }

  // ---------- controlled barge-in -----------------------------------------

  /**
   * Tracks the ambient noise floor while nobody is deliberately talking, so
   * the barge-in threshold is relative to the real room instead of a fixed
   * constant. Runs only for the lifetime of a session.
   */
  private startNoiseFloorTracking() {
    if (this.noiseFloorTimer !== null) return;
    this.noiseFloor = 0.02;
    this.noiseFloorTimer = window.setInterval(() => {
      if (this.muted) return;
      const level = this.getMicLevel();
      // Only quiet samples may raise the floor; loud speech must not poison it.
      const target = Math.min(level, this.noiseFloor * 1.6 + 0.01);
      this.noiseFloor += (target - this.noiseFloor) * NOISE_FLOOR_ALPHA;
      this.noiseFloor = Math.max(0.005, Math.min(0.35, this.noiseFloor));
    }, 120);
  }

  /** Level a sample must beat to count as real speech in this room. */
  private get bargeInThreshold(): number {
    return Math.max(
      BARGE_IN_MIN_LEVEL,
      this.noiseFloor * BARGE_IN_NOISE_FACTOR,
      this.noiseFloor + BARGE_IN_NOISE_MARGIN,
    );
  }

  /**
   * Watches the local microphone level while the assistant speaks. A real
   * interruption is only accepted after ~650ms of continuous voice activity
   * clearly above the measured noise floor, so short sounds ("hmm", a cough,
   * a keyboard tap, speaker echo) never cut the answer off.
   */
  private beginBargeInWatch() {
    if (this.bargeInTimer !== null) return;
    if (this.muted) return; // muted mic can never interrupt
    this.interruptionPending = true;
    this.bargeInSamples = 0;
    this.bargeInElapsed = 0;
    const threshold = this.bargeInThreshold;
    this.bargeInTimer = window.setInterval(() => {
      if (this.closing || (!this.speaking && this.state !== "speaking")) {
        this.cancelBargeInWatch();
        return;
      }
      this.bargeInElapsed += BARGE_IN_SAMPLE_MS;
      const level = this.getMicLevel();
      if (level >= threshold) {
        this.bargeInSamples += 1;
        if (this.bargeInSamples * BARGE_IN_SAMPLE_MS >= BARGE_IN_SUSTAIN_MS) {
          rtLog("barge-in confirmed — sustained speech while speaking", { level, threshold });
          this.confirmInterrupt();
        }
        return;
      }
      // A short dip is tolerated; a real gap resets the counter.
      this.bargeInSamples = Math.max(0, this.bargeInSamples - 1);
      if (this.bargeInElapsed >= BARGE_IN_WINDOW_MS) {
        rtLog("barge-in rejected — activity was transient noise", { level, threshold });
        this.rejectBargeIn();
      }
    }, BARGE_IN_SAMPLE_MS);
  }

  /**
   * The candidate was noise: keep the answer playing AND drop the captured
   * audio so a "hmm" never resurfaces as a separate user turn afterwards.
   */
  private rejectBargeIn() {
    this.cancelBargeInWatch();
    this.sendEvent({ type: "input_audio_buffer.clear" });
  }


  private cancelBargeInWatch() {
    if (this.bargeInTimer !== null) {
      window.clearInterval(this.bargeInTimer);
      this.bargeInTimer = null;
    }
    this.bargeInSamples = 0;
    this.bargeInElapsed = 0;
    this.interruptionPending = false;
  }


  /** "Dinliyorum" is only ever shown once the realtime session is ready. */
  private goListening() {
    if (this.closing) return;
    // Listening is gated on the realtime session, never on RTCPeerConnection.
    if (!this.sessionReady) return;
    if (this.readyFallbackTimer !== null) {
      window.clearTimeout(this.readyFallbackTimer);
      this.readyFallbackTimer = null;
    }
    rtLog("state listening");
    this.setState("listening");
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
    this.requestResponse();
  }

  /** Single entry point for response.create, so no turn is generated twice. */
  private requestResponse() {
    if (this.responseCreatePending || this.activeResponseId) {
      rtLog("response.create skipped — one is already in flight");
      return;
    }
    this.responseCreatePending = true;
    this.sendEvent({ type: "response.create" });

  }

  private sendEvent(payload: Record<string, unknown>) {
    const type = String(payload.type ?? "unknown");
    if (this.dc?.readyState !== "open") {
      rtLog(`➡ ${type} DROPPED (data channel ${this.dc?.readyState ?? "none"})`);
      return;
    }
    try {
      this.dc.send(JSON.stringify(payload));
      rtLog(`➡ ${type} sent`);
    } catch (err) {
      rtLog(`➡ ${type} send FAILED`, String(err));
    }
  }

  // ---------- controls -----------------------------------------------------

  startListening() {
    this.unmute();
    if (this.isConnected()) this.goListening();
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
    this.requestResponse();

    this.setState("thinking");
  }

  /** Explicit user interruption (tap): no noise verification needed. */
  interrupt() {
    this.confirmInterrupt();
  }

  /**
   * Accepts an interruption and keeps client and server in sync:
   * cancel the response, flush queued output audio, then truncate the
   * assistant item at the exact point the user actually heard so the model's
   * conversation state matches reality on the next turn.
   */
  private confirmInterrupt() {
    this.cancelBargeInWatch();
    const heardMs = this.playbackStartedAt ? Math.max(0, Date.now() - this.playbackStartedAt) : 0;

    if (this.activeResponseId) {
      // Every later event from this response is stale from now on.
      this.cancelledResponseIds.add(this.activeResponseId);
      this.sendEvent({ type: "response.cancel", response_id: this.activeResponseId });
    } else {
      this.sendEvent({ type: "response.cancel" });
    }
    this.sendEvent({ type: "output_audio_buffer.clear" });

    if (this.lastAssistantItemId) {
      this.sendEvent({
        type: "conversation.item.truncate",
        item_id: this.lastAssistantItemId,
        content_index: 0,
        audio_end_ms: heardMs,
      });
    }

    this.activeResponseId = null;
    this.lastAssistantItemId = null;
    this.playbackStartedAt = null;
    this.responseCreatePending = false;
    this.assistantBuffer = "";
    this.speaking = false;
    this.setState("interrupted");
    this.goListening();
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
    this.clearTimers();
    this.cancelBargeInWatch();
    this.sessionReady = false;
    // Reset per-session response bookkeeping so a reconnect starts clean.
    this.activeResponseId = null;
    this.lastAssistantItemId = null;
    this.playbackStartedAt = null;
    this.responseCreatePending = false;
    this.cancelledResponseIds.clear();
    this.assistantBuffer = "";
    if (this.dc) this.dc.onclose = null;
    try { this.dc?.close(); } catch { /* noop */ }
    try { this.pc?.getSenders().forEach((s) => s.track?.stop()); } catch { /* noop */ }
    try { this.pc?.close(); } catch { /* noop */ }
    try { this.micStream?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    try { this.audioEl?.pause(); } catch { /* noop */ }
    if (this.audioEl) this.audioEl.srcObject = null;
    try { void this.audioCtx?.close(); } catch { /* noop */ }
    this.analyser = null; this.levelBuf = null; this.audioCtx = null; this.speaking = false;
    this.outAnalyser = null; this.outBuf = null;
    this.dc = null; this.pc = null; this.micStream = null; this.audioEl = null;
    rtLog("teardown complete");
  }


}

function safeJson(s: string): Record<string, unknown> {
  try { return JSON.parse(s) as Record<string, unknown>; } catch { return {}; }
}
