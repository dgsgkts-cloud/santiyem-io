// ============================================================
// Live transcript for the voice overlay — deliberately NOT a chat.
// The current exchange (your last line + the assistant's last line) is
// the focus at full opacity; the exchange before it stays as a single
// dimmed, clamped echo line and everything older is dropped. Sits above
// the controls in its own bounded, internally scrolling region.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import type { TranscriptChunk } from "@/lib/voice/voiceTypes";

interface Props {
  transcripts: TranscriptChunk[];
}

/** Treat "within 24px of the bottom" as still following the live text. */
const STICK_THRESHOLD_PX = 24;

/** Overlay canvas colour — used for the soft scroll fades. */
const CANVAS = "#070B14";

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

  const lastUser = [...transcripts].reverse().find((t) => t.role === "user");
  const lastAI = [...transcripts].reverse().find((t) => t.role === "assistant");

  // One dimmed echo of the previous exchange keeps context without
  // turning the screen into a message history.
  const currentIds = new Set([lastUser?.id, lastAI?.id].filter(Boolean));
  const previous = [...transcripts]
    .reverse()
    .find((t) => !currentIds.has(t.id) && t.text.trim().length > 0);

  // Auto-follow the newest line whenever the transcript grows.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setScrollable(el.scrollHeight > el.clientHeight + 1);
    if (!stickRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [transcripts, lastUser?.text, lastAI?.text]);

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
        {previous && (
          <p
            key={previous.id}
            className="line-clamp-1 whitespace-pre-wrap break-words text-[13px] leading-snug text-white/20 transition-opacity duration-500"
          >
            {previous.text}
          </p>
        )}
        {lastUser && (
          <p
            key={lastUser.id}
            className="mt-1.5 animate-fade-in whitespace-pre-wrap break-words text-[15px] leading-snug text-white/50 transition-opacity duration-300"
          >
            {lastUser.text}
          </p>
        )}
        {lastAI && (
          <p
            key={lastAI.id}
            className="mt-2 animate-fade-in whitespace-pre-wrap break-words text-[17px] font-medium leading-snug tracking-tight text-white transition-opacity duration-300"
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
            className="pointer-events-none absolute inset-x-0 top-0 h-7"
            style={{ background: `linear-gradient(to bottom, ${CANVAS}, transparent)` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-7"
            style={{ background: `linear-gradient(to top, ${CANVAS}, transparent)` }}
          />
        </>
      )}
    </div>
  );
}

export default VoiceCaptions;
