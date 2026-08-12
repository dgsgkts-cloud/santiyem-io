// ============================================================
// Live voice caption — deliberately NOT a chat.
//
// Text arrives as soft word-group chunks: each new chunk fades in
// (opacity 0→1, translateY 4px→0, ~220ms) instead of animating per
// character. Interim text sits at a lower opacity and settles to full
// opacity when it becomes final. The container has a fixed height so
// the layout never shifts while the assistant talks.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import type { TranscriptChunk } from "@/lib/voice/voiceTypes";

interface Props {
  transcripts: TranscriptChunk[];
}

/** Words per soft chunk — groups feel calm, single words feel jumpy. */
const CHUNK_WORDS = 4;

/** Splits text into stable word groups so chunk keys never change. */
function toChunks(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < words.length; i += CHUNK_WORDS) {
    out.push(words.slice(i, i + CHUNK_WORDS).join(" "));
  }
  return out;
}

/** Keeps the visible caption to the last ~2 lines of content. */
const MAX_VISIBLE_CHUNKS = 6;

export function VoiceCaptions({ transcripts }: Props) {
  const lastUser = [...transcripts].reverse().find((t) => t.role === "user" && t.text.trim());
  const lastAI = [...transcripts].reverse().find((t) => t.role === "assistant" && t.text.trim());

  // The assistant's line is the focus; the user's last line is a quiet echo.
  const active = lastAI ?? lastUser;
  const isAssistant = Boolean(lastAI);

  const chunks = useMemo(() => {
    const all = toChunks(active?.text ?? "");
    return all.slice(Math.max(0, all.length - MAX_VISIBLE_CHUNKS));
  }, [active?.text]);

  // Chunks already shown must not re-animate on every delta.
  const seen = useRef<Set<string>>(new Set());
  const [, force] = useState(0);
  const idPrefix = `${active?.role ?? "x"}:${active?.id ?? "x"}`;
  useEffect(() => {
    let added = false;
    chunks.forEach((c, i) => {
      const key = `${idPrefix}#${i}:${c}`;
      if (!seen.current.has(key)) { seen.current.add(key); added = true; }
    });
    if (seen.current.size > 400) seen.current = new Set();
    if (added) force((n) => n + 1);
  }, [chunks, idPrefix]);

  if (!active) return null;

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Fixed height: two lines of caption, so nothing below ever moves. */}
      <div
        aria-live="polite"
        className="flex items-end justify-center overflow-hidden text-center"
        style={{ height: 56 }}
      >
        <p
          className="whitespace-pre-wrap break-words transition-opacity duration-500"
          style={{
            fontSize: isAssistant ? 16.5 : 15,
            lineHeight: "24px",
            letterSpacing: "-0.005em",
            color: isAssistant ? "hsl(0 0% 100% / 0.92)" : "hsl(0 0% 100% / 0.5)",
            opacity: active.final ? 1 : 0.82,
          }}
        >
          {chunks.map((c, i) => (
            <span
              key={`${idPrefix}#${i}:${c}`}
              className="voice-caption-chunk"
              style={{ display: "inline" }}
            >
              {c}
              {i < chunks.length - 1 ? " " : ""}
            </span>
          ))}
        </p>
      </div>

      {/* Quiet echo of what the user said, one clamped line. */}
      {isAssistant && lastUser && (
        <p className="mt-1 line-clamp-1 text-center text-[13px] leading-snug text-white/25 transition-opacity duration-500">
          {lastUser.text}
        </p>
      )}
    </div>
  );
}

export default VoiceCaptions;
