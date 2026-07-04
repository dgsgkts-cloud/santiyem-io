// Sentence-aware chunker with token target + overlap.
// Approx tokenization: 1 token ≈ 4 chars (Turkish/English mix).

const TOKEN_CHARS = 4;
const TARGET_TOKENS = 1000;   // 800–1200 target
const OVERLAP_TOKENS = 150;   // 100–200 overlap
const MIN_CHARS = 120;        // skip tiny fragments

export interface Chunk {
  content: string;
  charLen: number;
  tokenCount: number;
}

function splitSentences(text: string): string[] {
  // Preserve sentence terminators; handle TR "." ":" "!" "?" and newlines
  const parts = text
    .replace(/\r\n/g, "\n")
    .split(/(?<=[\.\!\?\n])\s+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts;
}

function tokLen(s: string): number {
  return Math.max(1, Math.ceil(s.length / TOKEN_CHARS));
}

export function chunkText(input: string): Chunk[] {
  const text = (input || "").replace(/\s+\n/g, "\n").trim();
  if (!text) return [];
  const sentences = splitSentences(text);

  const chunks: Chunk[] = [];
  let buf: string[] = [];
  let bufTok = 0;

  const flush = () => {
    if (!buf.length) return;
    const content = buf.join(" ").trim();
    if (content.length >= MIN_CHARS) {
      chunks.push({
        content,
        charLen: content.length,
        tokenCount: tokLen(content),
      });
    }
    buf = [];
    bufTok = 0;
  };

  for (const s of sentences) {
    const t = tokLen(s);
    if (bufTok + t > TARGET_TOKENS && buf.length) {
      // Compose current chunk, then start next with overlap tail
      const content = buf.join(" ").trim();
      if (content.length >= MIN_CHARS) {
        chunks.push({
          content,
          charLen: content.length,
          tokenCount: tokLen(content),
        });
      }
      // Build overlap from tail sentences
      const overlap: string[] = [];
      let ovTok = 0;
      for (let i = buf.length - 1; i >= 0 && ovTok < OVERLAP_TOKENS; i--) {
        overlap.unshift(buf[i]);
        ovTok += tokLen(buf[i]);
      }
      buf = overlap.slice();
      bufTok = ovTok;
    }
    buf.push(s);
    bufTok += t;
  }
  flush();
  return chunks;
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
