// ============================================================
// Sprint 42 — Live subtitle area for the voice overlay.
// Sits above the controls, never over the orb. Shows the latest
// user turn and the streaming assistant answer as clean captions.
// ============================================================

import { useEffect, useRef } from "react";
import type { TranscriptChunk } from "@/lib/voice/voiceTypes";

interface Props {
  transcripts: TranscriptChunk[];
}

export function VoiceCaptions({ transcripts }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [transcripts]);

  const lastUser = [...transcripts].reverse().find((t) => t.role === "user");
  const lastAI = [...transcripts].reverse().find((t) => t.role === "assistant");
  if (!lastUser && !lastAI) return null;

  return (
    <div
      ref={ref}
      aria-live="polite"
      className="mx-auto w-full max-w-md overflow-y-auto bg-black/35 px-4 py-3 backdrop-blur-md"
      style={{ maxHeight: "26vh", borderRadius: "var(--radius-card, 16px)" }}
    >
      {lastUser && (
        <div className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Siz</p>
          <p className="line-clamp-3 text-[15px] leading-snug text-white">{lastUser.text}</p>
        </div>
      )}
      {lastAI && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
            Şantiyem AI
          </p>
          <p className="line-clamp-4 text-[15px] leading-snug text-white/90">{lastAI.text}</p>
        </div>
      )}
    </div>
  );
}

export default VoiceCaptions;
