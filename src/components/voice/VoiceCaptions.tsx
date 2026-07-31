// ============================================================
// Sprint 42 — Live subtitle area for the voice overlay.
// Sits above the controls, never over the orb and never behind
// them: the region has its own bounded height, scrolls internally
// and keeps following the newest line unless the user scrolls up.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import type { TranscriptChunk } from "@/lib/voice/voiceTypes";

interface Props {
  transcripts: TranscriptChunk[];
}

/** Treat "within 24px of the bottom" as still following the live text. */
const STICK_THRESHOLD_PX = 24;

export function VoiceCaptions({ transcripts }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const [scrollable, setScrollable] = useState(false);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    stickRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_THRESHOLD_PX;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setScrollable(el.scrollHeight > el.clientHeight + 1);
    if (!stickRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [transcripts]);

  const lastUser = [...transcripts].reverse().find((t) => t.role === "user");
  const lastAI = [...transcripts].reverse().find((t) => t.role === "assistant");
  if (!lastUser && !lastAI) return null;

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        ref={ref}
        onScroll={onScroll}
        aria-live="polite"
        className="w-full overflow-y-auto overscroll-contain bg-black/35 px-4 py-3 backdrop-blur-md [-webkit-overflow-scrolling:touch]"
        style={{
          maxHeight: "min(32vh, 240px)",
          borderRadius: "var(--radius-card, 16px)",
          scrollbarWidth: "thin",
        }}
      >
        {lastUser && (
          <div className="mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Siz</p>
            <p className="whitespace-pre-wrap break-words text-[15px] leading-snug text-white">
              {lastUser.text}
            </p>
          </div>
        )}
        {lastAI && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
              Şantiyem AI
            </p>
            <p className="whitespace-pre-wrap break-words text-[15px] leading-snug text-white/90">
              {lastAI.text}
            </p>
          </div>
        )}
      </div>

      {/* Soft fades so long text visibly scrolls inside the region
          instead of appearing to slide behind the controls. */}
      {scrollable && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-6 rounded-t-[16px] bg-gradient-to-b from-[#0B0F14] to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-6 rounded-b-[16px] bg-gradient-to-t from-[#0B0F14] to-transparent"
          />
        </>
      )}
    </div>
  );
}

export default VoiceCaptions;
