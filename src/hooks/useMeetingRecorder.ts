import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const CHUNK_MS = 15000; // 15s windows

type Options = {
  meetingId: string;
  language?: string;
  onTranscript?: (text: string, seq: number) => void;
};

/**
 * Records mic audio in fresh MediaRecorder segments (each self-contained),
 * uploads each finished segment to `meeting-transcribe-chunk`, and streams
 * back finalized transcript text.
 */
export function useMeetingRecorder({ meetingId, language = "tr", onTranscript }: Options) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunkRef = useRef<Blob[]>([]);
  const seqRef = useRef(0);
  const startTsRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const rotateRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const audioPrefixRef = useRef<string | null>(null);

  const pickMime = () => {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
    }
    return "";
  };

  /**
   * Her segment hem yazıya çevrilir hem de `meeting-audio` kovasına saklanır.
   * Segmentler bağımsız birer dosya olduğu için kayıt sonradan bölüm bölüm
   * dinlenebilir ve tarayıcı kapansa bile ses kaybolmaz.
   */
  const uploadChunk = useCallback(
    async (blob: Blob, seq: number, offsetMs: number) => {
      try {
        if (blob.size < 2048) return;
        const { data: sess } = await supabase.auth.getSession();
        const jwt = sess?.session?.access_token;
        const uid = sess?.session?.user?.id;

        if (uid) {
          const ext = blob.type.includes("mp4") ? "mp4" : "webm";
          const path = `${uid}/${meetingId}/seg_${String(seq).padStart(4, "0")}.${ext}`;
          void supabase.storage
            .from("meeting-audio")
            .upload(path, blob, { contentType: blob.type || "audio/webm", upsert: true })
            .then(({ error }) => {
              if (error) console.warn("audio segment upload failed", error.message);
              else audioPrefixRef.current = `${uid}/${meetingId}`;
            });
        }

        const form = new FormData();
        form.append("file", blob, `chunk_${seq}.webm`);
        form.append("meeting_id", meetingId);
        form.append("seq", String(seq));
        form.append("started_at_ms", String(offsetMs));
        form.append("language", language);
        const res = await fetch(`${SUPABASE_URL}/functions/v1/meeting-transcribe-chunk`, {
          method: "POST",
          headers: { Authorization: `Bearer ${jwt ?? ""}` },
          body: form,
        });
        const json = await res.json().catch(() => ({}));
        if (json?.text && onTranscript) onTranscript(String(json.text), seq);
      } catch (e) {
        console.warn("chunk upload failed", e);
      }
    },
    [meetingId, language, onTranscript],
  );

  const startSegment = useCallback(() => {
    if (!streamRef.current) return;
    const mime = pickMime();
    const rec = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined);
    chunkRef.current = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunkRef.current.push(e.data); };
    const seq = seqRef.current++;
    const offset = Date.now() - startTsRef.current;
    rec.onstop = () => {
      const blob = new Blob(chunkRef.current, { type: mime || "audio/webm" });
      chunkRef.current = [];
      void uploadChunk(blob, seq, offset);
    };
    rec.start();
    recorderRef.current = rec;
  }, [uploadChunk]);

  const rotate = useCallback(() => {
    if (pausedRef.current) return;
    const rec = recorderRef.current;
    if (rec && rec.state === "recording") {
      rec.stop();
      // start next segment on next tick
      setTimeout(() => { if (!pausedRef.current) startSegment(); }, 30);
    }
  }, [startSegment]);

  const setupLevelMeter = (stream: MediaStream) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i];
        setLevel(Math.min(1, sum / (buf.length * 180)));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* ignore */ }
  };

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      startTsRef.current = Date.now();
      seqRef.current = 0;
      pausedRef.current = false;
      setElapsed(0);
      setIsRecording(true);
      setIsPaused(false);
      setupLevelMeter(stream);
      startSegment();
      rotateRef.current = window.setInterval(rotate, CHUNK_MS);
      timerRef.current = window.setInterval(
        () => setElapsed(Math.round((Date.now() - startTsRef.current) / 1000)),
        500,
      );
    } catch (e: any) {
      setError(e?.message || "Mikrofon erişimi reddedildi.");
      setIsRecording(false);
    }
  }, [rotate, startSegment]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setIsPaused(true);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setIsPaused(false);
    startSegment();
  }, [startSegment]);

  const stop = useCallback(async () => {
    if (rotateRef.current) { clearInterval(rotateRef.current); rotateRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    pausedRef.current = true;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
    // let the last segment upload finish
    await new Promise((r) => setTimeout(r, 1200));
    return audioPrefixRef.current;
  }, []);

  useEffect(() => () => { void stop(); }, [stop]);

  return {
    isRecording, isPaused, elapsed, level, error, start, pause, resume, stop,
    getAudioPrefix: () => audioPrefixRef.current,
  };
}
