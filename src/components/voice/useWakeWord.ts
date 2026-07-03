import { useEffect, useRef } from "react";

// Very small wake-phrase listener using the Web Speech API (Chrome/Edge/Safari iOS 14.5+).
// Runs *in addition* to the ElevenLabs mic pipeline (browsers allow multiple audio
// consumers on the same track). When it hears "şantiyem" / "hey şantiyem" it fires
// `onWake`. Silent for browsers without SpeechRecognition.
export function useWakeWord(opts: {
  enabled: boolean;
  onWake: () => void;
  phrases?: string[];
}) {
  const { enabled, onWake } = opts;
  const phrases = (opts.phrases ?? ["şantiyem", "santiyem", "hey şantiyem", "hey santiyem"]).map(p => p.toLowerCase());
  const onWakeRef = useRef(onWake);
  useEffect(() => { onWakeRef.current = onWake; }, [onWake]);

  useEffect(() => {
    if (!enabled) return;
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.info("[wake] SpeechRecognition not available in this browser");
      return;
    }
    let stopped = false;
    let rec: any;
    const start = () => {
      try {
        rec = new SR();
        rec.lang = "tr-TR";
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (ev: any) => {
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            const t = String(ev.results[i][0]?.transcript ?? "").toLowerCase().trim();
            if (!t) continue;
            if (phrases.some(p => t.includes(p))) {
              console.log("[wake] matched:", t);
              onWakeRef.current?.();
            }
          }
        };
        rec.onerror = (e: any) => { console.warn("[wake] error", e?.error); };
        rec.onend = () => { if (!stopped) setTimeout(start, 400); };
        rec.start();
      } catch (e) { console.warn("[wake] start failed", e); }
    };
    start();
    return () => {
      stopped = true;
      try { rec?.stop(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
