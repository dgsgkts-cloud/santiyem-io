// ============================================================
// src/lib/voice/voiceTranscriptStore.ts
// Keeps the live conversation transcript alive across a dropped
// connection (and even a closed overlay) so a reconnect resumes
// where the user left off instead of starting from scratch.
// ============================================================

import type { TranscriptChunk } from "./voiceTypes";

const KEY = "santiyem_voice_transcript";
/** Keep the tail only — enough context to resume, never a full archive. */
const MAX_CHUNKS = 12;
/** Older sessions are irrelevant; treat them as expired. */
const MAX_AGE_MS = 30 * 60 * 1000;

interface Stored {
  ts: number;
  chunks: TranscriptChunk[];
}

export function saveVoiceTranscript(chunks: TranscriptChunk[]): void {
  try {
    const finalChunks = chunks.filter((c) => c.text.trim().length > 0).slice(-MAX_CHUNKS);
    if (finalChunks.length === 0) return;
    const payload: Stored = { ts: Date.now(), chunks: finalChunks };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch { /* storage unavailable — non-critical */ }
}

export function loadVoiceTranscript(): TranscriptChunk[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.chunks?.length) return [];
    if (Date.now() - parsed.ts > MAX_AGE_MS) {
      clearVoiceTranscript();
      return [];
    }
    return parsed.chunks;
  } catch {
    return [];
  }
}

export function clearVoiceTranscript(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* noop */ }
}

/**
 * Compact Turkish recap appended to the system prompt after a
 * reconnect so the assistant continues the same conversation.
 */
export function buildResumeContext(chunks: TranscriptChunk[]): string | undefined {
  if (chunks.length === 0) return undefined;
  const lines = chunks
    .slice(-6)
    .map((c) => `${c.role === "user" ? "Kullanıcı" : "Sen"}: ${c.text.trim()}`)
    .join("\n");
  return [
    "Bağlantı kesildi ve yeniden kuruldu. Aşağıda kesilmeden önceki konuşma var.",
    "Konuşmaya baştan başlamayın, selamlamayı tekrar etmeyin; kaldığınız yerden devam edin.",
    lines,
  ].join("\n");
}
