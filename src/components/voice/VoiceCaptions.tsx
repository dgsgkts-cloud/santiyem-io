// ============================================================
// Live transcript for the voice overlay — deliberately NOT a chat.
// Only the current exchange is shown (your last line + the assistant's
// last line), fading in smoothly as speech is recognised. Sits above
// the controls in its own bounded, internally scrolling region.
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
        className="w-full overflow-y-auto overscroll-contain px-1 py-1 text-center [-webkit-overflow-scrolling:touch]"
        style={{ maxHeight: "min(30vh, 220px)", scrollbarWidth: "none" }}
      >
        {lastUser && (
          <p
            key={lastUser.id}
            className="animate-fade-in whitespace-pre-wrap break-words text-[15px] leading-snug text-white/45"
          >
            {lastUser.text}
          </p>
        )}
        {lastAI && (
          <p
            key={lastAI.id}
            className="mt-2 animate-fade-in whitespace-pre-wrap break-words text-[17px] font-medium leading-snug tracking-tight text-white"
          >
            {lastAI.text}
          </p>
        )}
      </div>

      {/* Soft fades so long text visibly scrolls inside the region
          instead of appearing to slide behind the controls. */}
      {scrollable && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-7 bg-gradient-to-b from-[#080B10] to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-[#080B10] to-transparent"
          />
        </>
      )}
    </div>
  );
}

export default VoiceCaptions;
